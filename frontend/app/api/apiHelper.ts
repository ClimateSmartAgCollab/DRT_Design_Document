// app/api/apiHelper.ts

const DEFAULT_LOCAL_API_PORT = "8000";
const DEFAULT_LOCAL_API = `http://127.0.0.1:${DEFAULT_LOCAL_API_PORT}`;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

const isLoopbackHost = (hostname: string) => LOOPBACK_HOSTS.has(hostname);

const resolveBaseURL = () => {
  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    const configured = process.env.NEXT_PUBLIC_API_URL;

    // Same-site CSRF cookies require the page host and API host to match.
    // localhost and 127.0.0.1 are different sites; rewrite loopback API URLs
    // to the host the user actually opened.
    if (isLoopbackHost(hostname)) {
      if (configured) {
        try {
          const api = new URL(configured);
          if (isLoopbackHost(api.hostname)) {
            api.hostname = hostname;
            return api.origin;
          }
        } catch {
          // fall through
        }
        return configured;
      }
      return `http://${hostname}:${DEFAULT_LOCAL_API_PORT}`;
    }

    if (configured) {
      return configured;
    }
    return origin;
  }

  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_LOCAL_API;
};

const readCookieToken = (): string => {
  if (typeof document === "undefined") {
    return "";
  }
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

let csrfToken: string | null = null;
let csrfBootstrap: Promise<string> | null = null;

const isCsrfUrl = (url: string) => /\/drt\/auth\/csrf\/?$/.test(url);

const tokenFromCsrfBody = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    return typeof body?.csrfToken === "string" ? body.csrfToken : "";
  } catch {
    return "";
  }
};

const ensureCsrfToken = async (baseURL: string): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }
  const fromCookie = readCookieToken();
  if (fromCookie) {
    csrfToken = fromCookie;
    return csrfToken;
  }
  if (!csrfBootstrap) {
    csrfBootstrap = (async () => {
      try {
        const res = await fetch(`${baseURL}/drt/auth/csrf/`, {
          credentials: "include",
          cache: "no-store",
        });
        const token = (await tokenFromCsrfBody(res)) || readCookieToken();
        csrfToken = token || null;
        return token;
      } finally {
        csrfBootstrap = null;
      }
    })();
  }
  return csrfBootstrap;
};

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  // Handle both datastore and drt endpoints
  // endpoint should start with /datastore/ or /drt/
  const baseURL = resolveBaseURL();
  const url =
    endpoint.startsWith("http") || endpoint.startsWith("https")
      ? endpoint
      : `${baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const method = (options.method || "GET").toUpperCase();

  let token = csrfToken || readCookieToken();
  if (!SAFE_METHODS.has(method) && !isCsrfUrl(url)) {
    token = await ensureCsrfToken(baseURL);
  }

  const defaultOptions: RequestInit = {
    credentials: "include", // Includes cookies for cross-origin requests
    ...options,
    cache: "no-store",
    // X-CSRFToken is set last so callers cannot overwrite it with an empty
    // document.cookie read (the previous email-entry 403).
    headers: {
      ...options.headers,
      ...(token ? { "X-CSRFToken": token } : {}),
    },
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (isCsrfUrl(url) && !csrfToken) {
      const cached = (await tokenFromCsrfBody(response.clone())) || readCookieToken();
      if (cached) {
        csrfToken = cached;
      }
    }

    // Validate status (similar to axios's `validateStatus` function)
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response; // Return raw response to handle in calling function
  } catch (error) {
    // Handle fetch errors
    console.error("Fetch API error:", error);
    throw error;
  }
};

export default fetchApi;
