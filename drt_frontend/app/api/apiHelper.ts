// app/api/apiHelper.ts
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${baseURL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include', // Includes cookies for cross-origin requests
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
    console.error('Fetch API error:', error);
    throw error;
  }
};

export default fetchApi;
