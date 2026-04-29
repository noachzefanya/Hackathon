import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── API helpers ───────────────────────────────────────────────────────────────

export const apiScoreTransaction = (payload: object) =>
  api.post('/score', payload).then((r) => r.data);

export const apiGetTransactions = (params?: object) =>
  api.get('/transactions', { params }).then((r) => r.data);

export const apiGetTransaction = (id: string) =>
  api.get(`/transactions/${id}`).then((r) => r.data);

export const apiGetQueueTransactions = (params?: object) =>
  api.get('/transactions/queue', { params }).then((r) => r.data);

export const apiGetAlerts = (params?: object) =>
  api.get('/alerts', { params }).then((r) => r.data);

export const apiResolveAlert = (id: string, notes?: string) =>
  api.post(`/alerts/${id}/resolve`, { notes }).then((r) => r.data);

export const apiGetAlertStats = () =>
  api.get('/alerts/stats/summary').then((r) => r.data);

export const apiGetGraph = (entityId: string, depth = 2) =>
  api.get(`/graph/${entityId}`, { params: { depth } }).then((r) => r.data);

export const apiLogin = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const apiGetMe = () => api.get('/users/me').then((r) => r.data);
