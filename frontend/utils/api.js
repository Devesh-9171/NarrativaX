import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://readnovax.onrender.com/api';

function resolveApiBaseUrl() {
  const candidate = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).trim();

  try {
    const parsed = new URL(candidate);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '') || '/api'}`;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
