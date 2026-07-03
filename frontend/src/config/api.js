// Centralized API base URL configuration
let baseUrl = import.meta.env.VITE_API_URL;

// On local development (localhost / 127.0.0.1), always target local backend http://localhost:5000
if (typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  baseUrl = 'http://localhost:5000';
} else if (!baseUrl || baseUrl.includes('localhost')) {
  // Production deployment (decantatelier.in, vercel.app, etc.) targets Railway production backend
  baseUrl = 'https://pefume-production.up.railway.app';
}

// Clean trailing '/api' or slashes to prevent '/api/api' route issues in requests
if (baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.slice(0, -4);
}
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1);
}

export const API_BASE_URL = baseUrl;
