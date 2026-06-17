export const API_ROUTES = {
  health: '/api/health',
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    me: '/api/auth/me',
    updateMe: '/api/auth/me',
    changePassword: '/api/auth/me/password',
  },
  projects: {
    list: '/api/projects',
    detail: (id) => `/api/projects/${id}`,
    recapPdf: (id) => `/api/projects/${id}/recap.pdf`,
  },
  products: {
    list: (projectId) => `/api/projects/${projectId}/products`,
    detail: (projectId, productId) => `/api/projects/${projectId}/products/${productId}`,
  },
  supplier: {
    me: '/api/supplier/me',
    workspace: '/api/supplier/workspace',
    products: '/api/supplier/products',
    product: (id) => `/api/supplier/products/${id}`,
    productPublication: (id) => `/api/supplier/products/${id}/publication`,
    productImages: (id) => `/api/supplier/products/${id}/images`,
  },
  catalogue: {
    products: '/api/catalogue/products',
  },
  support: {
    listMine: '/api/support-items/me',
    create: '/api/support-items',
  },
  admin: {
    users: '/api/admin/users',
    user: (id) => `/api/admin/users/${id}`,
    userRole: (id) => `/api/admin/users/${id}/role`,
    suppliers: '/api/admin/suppliers',
    supplier: (id) => `/api/admin/suppliers/${id}`,
    products: '/api/admin/products',
    product: (id) => `/api/admin/products/${id}`,
    simulations: '/api/admin/simulations',
    simulation: (id) => `/api/admin/simulations/${id}`,
    supportItems: '/api/admin/support-items',
    supportItem: (id) => `/api/admin/support-items/${id}`,
  },
};
