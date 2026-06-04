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
    productImages: (id) => `/api/supplier/products/${id}/images`,
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
    simulations: '/api/admin/simulations',
    simulation: (id) => `/api/admin/simulations/${id}`,
    supportItems: '/api/admin/support-items',
    supportItem: (id) => `/api/admin/support-items/${id}`,
    supplierRequests: '/api/admin/supplier-requests',
    approveSupplierRequest: (id) => `/api/admin/supplier-requests/${id}/approve`,
    rejectSupplierRequest: (id) => `/api/admin/supplier-requests/${id}/reject`,
  },
};
