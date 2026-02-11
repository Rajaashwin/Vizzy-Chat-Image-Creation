// API Configuration
// This automatically uses the correct backend URL based on environment
// For production on GitHub Pages: set VITE_API_BASE_URL to your Vercel backend URL
// e.g., VITE_API_BASE_URL=https://vizzy-chat-image-generator.vercel.app

const isDevelopment = import.meta.env.MODE === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'
  : import.meta.env.VITE_API_BASE_URL || 'https://web-production-d4489.up.railway.app';

export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  session: `${API_BASE_URL}/session`,
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
