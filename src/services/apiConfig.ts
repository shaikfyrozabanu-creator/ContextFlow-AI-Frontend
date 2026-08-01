const rawUrl = import.meta.env.VITE_API_URL || 'https://rag-chatbot-95hw.onrender.com';
export const API_BASE_URL = rawUrl.replace(/\/+$/, '');
