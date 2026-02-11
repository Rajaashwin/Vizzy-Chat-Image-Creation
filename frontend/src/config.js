// API Configuration
// This automatically uses the correct backend URL based on environment
// In production, both frontend and backend are served from the same Render domain
// So we use relative URLs or window.location.origin

const isDevelopment = import.meta.env.MODE === 'development';

let API_BASE_URL;

if (isDevelopment) {
  // Development: frontend on 5173, backend on 8000
  API_BASE_URL = 'http://localhost:8000';
} else {
  // Production: both served from same origin
  API_BASE_URL = window.location.origin;
}

export { API_BASE_URL };

export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  session: `${API_BASE_URL}/session`,
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
