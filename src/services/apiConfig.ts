/**
 * Base API URL for backend service calls pointing to the FastAPI server.
 * Uses VITE_API_URL from environment variables (set in .env or Vercel dashboard),
 * with a fallback to the production Render backend URL.
 */
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://rag-chatbot-1-fkvu.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
