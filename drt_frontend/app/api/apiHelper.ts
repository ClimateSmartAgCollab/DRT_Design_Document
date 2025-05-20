// app/api/apiHelper.ts
// const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://drt-design-document.onrender.com';
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${baseURL}${endpoint}`;
  const match = document.cookie.match(/csrftoken=([^;]+)/);
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
