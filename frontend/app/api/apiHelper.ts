// app/api/apiHelper.ts

const DEFAULT_LOCAL_API = "http://127.0.0.1:8000";

const resolveBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return DEFAULT_LOCAL_API;
    }

    return origin;
  }

  return DEFAULT_LOCAL_API;
};

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  // Handle both datastore and drt endpoints
  // endpoint should start with /datastore/ or /drt/
  const baseURL = resolveBaseURL();
  const url =
    endpoint.startsWith("http") || endpoint.startsWith("https")
      ? endpoint
      : `${baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const match =
    typeof document !== "undefined"
      ? document.cookie.match(/csrftoken=([^;]+)/)
      : null;
  const csrfToken = match ? match[1] : "";
  const defaultOptions: RequestInit = {
    credentials: "include", // Includes cookies for cross-origin requests
    headers: {
      "X-CSRFToken": csrfToken,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

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
