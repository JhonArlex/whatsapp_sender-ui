import axios from "axios";

const API_URL = import.meta.env.VITE_BULK_API_URL || "http://localhost:8010";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Interceptor para añadir JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ws_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("ws_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem("ws_access_token", access_token);
          localStorage.setItem("ws_refresh_token", refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("ws_access_token");
          localStorage.removeItem("ws_refresh_token");
          localStorage.removeItem("ws_user");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── API functions ──────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", { email, password }),
  register: (email: string, password: string, full_name: string) =>
    api.post("/api/v1/auth/register", { email, password, full_name }),
  me: () => api.get("/api/v1/auth/me"),
  logout: (refresh_token: string) =>
    api.post("/api/v1/auth/logout", { refresh_token }),
};

export const connectionsApi = {
  list: () => api.get("/api/v1/connections"),
  create: (data: { name: string; base_url: string; api_key: string }) =>
    api.post("/api/v1/connections", data),
  delete: (id: string) => api.delete(`/api/v1/connections/${id}`),
  verify: (id: string) => api.post(`/api/v1/connections/${id}/verify`),
};

export const instancesApi = {
  list: () => api.get("/api/v1/instances"),
  sync: () => api.post("/api/v1/instances/sync"),
};

export const groupsApi = {
  list: (params?: { search?: string; instance_id?: string }) =>
    api.get("/api/v1/groups", { params }),
  sync: () => api.post("/api/v1/groups/sync"),
};

export const jobsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/api/v1/jobs", { params }),
  create: (data: {
    name?: string;
    groups: Array<{
      remote_jid: string;
      push_name?: string;
      instance_name: string;
      instance_token: string;
      evolution_base_url: string;
    }>;
    messages: Array<{
      msg_type: string;
      content: string;
      media_base64?: string;
      media_mimetype?: string;
      file_name?: string;
    }>;
  }) => api.post("/api/v1/jobs", data),
  get: (id: string) => api.get(`/api/v1/jobs/${id}`),
  cancel: (id: string) => api.post(`/api/v1/jobs/${id}/cancel`),
  retryFailed: (id: string) => api.post(`/api/v1/jobs/${id}/retry-failed`),
};

export const messagesApi = {
  list: (params?: {
    job_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get("/api/v1/messages", { params }),
  resend: (id: string) => api.post(`/api/v1/messages/${id}/resend`),
};

export const statsApi = {
  overview: () => api.get("/api/v1/stats/overview"),
  daily: () => api.get("/api/v1/stats/daily"),
};
