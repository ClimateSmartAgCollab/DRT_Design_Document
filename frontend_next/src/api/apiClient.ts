// src/api/apiClient.ts
import axios from 'axios';


const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // Set this in .env.local
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
