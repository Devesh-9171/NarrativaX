import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://readnovax.onrender.com/api';
const API_TIMEOUT_MS = 30000;

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
  timeout: API_TIMEOUT_MS
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.code === 'ECONNABORTED'
      ? 'The server is taking longer than expected. Please try again.'
      : error?.response?.data?.message || error.message || 'Request failed';

    const normalizedError = new Error(message);
    normalizedError.status = error?.response?.status;
    normalizedError.code = error?.code;
    normalizedError.isTimeout = error?.code === 'ECONNABORTED';
    return Promise.reject(normalizedError);
  }
);

export { API_TIMEOUT_MS };
export default api;
