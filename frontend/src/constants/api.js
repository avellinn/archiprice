export const API_ROUTES = {
  health: '/api/health',
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    me: '/api/auth/me',
  },
  projects: {
    list: '/api/projects',
    detail: (id) => `/api/projects/${id}`,
  },
  products: {
    list: (projectId) => `/api/projects/${projectId}/products`,
    detail: (projectId, productId) => `/api/projects/${projectId}/products/${productId}`,
  },
};
