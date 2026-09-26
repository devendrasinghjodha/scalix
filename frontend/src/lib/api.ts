import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('scalix_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const orgId = localStorage.getItem('scalix_org_id');
      if (orgId) {
        config.headers['X-Organization-Id'] = orgId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('scalix_token');
        localStorage.removeItem('scalix_org_id');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ──────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ─── Organization API ──────────────────────────────────────────

export const orgApi = {
  list: () => api.get('/organizations'),
  create: (data: { name: string }) => api.post('/organizations', data),
  get: (id: string) => api.get(`/organizations/${id}`),
  update: (id: string, data: { name?: string }) =>
    api.patch(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
};

// ─── Member API ────────────────────────────────────────────────

export const memberApi = {
  list: (orgId: string) =>
    api.get(`/organizations/${orgId}/members`),
  invite: (orgId: string, data: { email: string; role: string }) =>
    api.post(`/organizations/${orgId}/members/invite`, data),
  changeRole: (orgId: string, memberId: string, data: { role: string }) =>
    api.patch(`/organizations/${orgId}/members/${memberId}/role`, data),
  remove: (orgId: string, memberId: string) =>
    api.delete(`/organizations/${orgId}/members/${memberId}`),
  listInvitations: (orgId: string) =>
    api.get(`/organizations/${orgId}/members/invitations`),
  revokeInvitation: (orgId: string, invitationId: string) =>
    api.delete(`/organizations/${orgId}/members/invitations/${invitationId}`),
  acceptInvitation: (token: string) =>
    api.post(`/invitations/${token}/accept`),
};

// ─── Project API ───────────────────────────────────────────────

export const projectApi = {
  list: (orgId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/organizations/${orgId}/projects`, { params }),
  create: (orgId: string, data: { name: string; description?: string }) =>
    api.post(`/organizations/${orgId}/projects`, data),
  get: (orgId: string, projectId: string) =>
    api.get(`/organizations/${orgId}/projects/${projectId}`),
  update: (orgId: string, projectId: string, data: { name?: string; description?: string }) =>
    api.patch(`/organizations/${orgId}/projects/${projectId}`, data),
  delete: (orgId: string, projectId: string) =>
    api.delete(`/organizations/${orgId}/projects/${projectId}`),
};

// ─── Task API ──────────────────────────────────────────────────

export const taskApi = {
  list: (orgId: string, params?: Record<string, string>) =>
    api.get(`/organizations/${orgId}/tasks`, { params }),
  create: (orgId: string, data: Record<string, unknown>) =>
    api.post(`/organizations/${orgId}/tasks`, data),
  get: (orgId: string, taskId: string) =>
    api.get(`/organizations/${orgId}/tasks/${taskId}`),
  update: (orgId: string, taskId: string, data: Record<string, unknown>) =>
    api.patch(`/organizations/${orgId}/tasks/${taskId}`, data),
  delete: (orgId: string, taskId: string) =>
    api.delete(`/organizations/${orgId}/tasks/${taskId}`),
};

// ─── Audit Log API ─────────────────────────────────────────────

export const auditLogApi = {
  list: (orgId: string, params?: Record<string, string>) =>
    api.get(`/organizations/${orgId}/audit-logs`, { params }),
};

// ─── Billing API ───────────────────────────────────────────────

export const billingApi = {
  getSubscription: (orgId: string) =>
    api.get(`/organizations/${orgId}/billing/subscription`),
  createCheckout: (orgId: string, data: { plan: string }) =>
    api.post(`/organizations/${orgId}/billing/checkout`, data),
  createPortal: (orgId: string) =>
    api.post(`/organizations/${orgId}/billing/portal`),
  cancel: (orgId: string) =>
    api.post(`/organizations/${orgId}/billing/cancel`),
};

export const teamApi = {
  list: (orgId: string) => api.get(`/organizations/${orgId}/teams`),
  create: (orgId: string, data: { name: string }) => api.post(`/organizations/${orgId}/teams`, data),
  get: (orgId: string, teamId: string) => api.get(`/organizations/${orgId}/teams/${teamId}`),
  update: (orgId: string, teamId: string, data: { name: string }) => api.patch(`/organizations/${orgId}/teams/${teamId}`, data),
  delete: (orgId: string, teamId: string) => api.delete(`/organizations/${orgId}/teams/${teamId}`),
  addMember: (orgId: string, teamId: string, userId: string) => api.post(`/organizations/${orgId}/teams/${teamId}/members`, { userId }),
  removeMember: (orgId: string, teamId: string, userId: string) => api.delete(`/organizations/${orgId}/teams/${teamId}/members/${userId}`),
};

export const apiKeyApi = {
  list: (orgId: string) => api.get(`/organizations/${orgId}/api-keys`),
  create: (orgId: string, data: { name: string; expiresAt?: string }) => api.post(`/organizations/${orgId}/api-keys`, data),
  revoke: (orgId: string, keyId: string) => api.delete(`/organizations/${orgId}/api-keys/${keyId}`),
};

export const usageApi = {
  current: (orgId: string) => api.get(`/organizations/${orgId}/usage/current`),
  history: (orgId: string) => api.get(`/organizations/${orgId}/usage/history`),
};

export default api;
