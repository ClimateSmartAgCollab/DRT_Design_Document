// app/api/apiHelper.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/drt', // Django backend URL
  withCredentials: true, // Include cookies if required by Django
  validateStatus: function (status) {
    return status < 500; // Resolve only if the status code is less than 500
  },
});

export default api;
