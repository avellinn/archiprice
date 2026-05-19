/**
 * En dev, Vite proxy `/api` → backend (baseURL vide).
 * En prod, définir VITE_API_URL (ex. https://api.example.com).
 */
export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL ?? '';
}
