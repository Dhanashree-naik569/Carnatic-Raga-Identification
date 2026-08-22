import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("raga_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("raga_token");
      localStorage.removeItem("raga_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;

export const authApi = {
  register: (payload) => client.post("/auth/register", payload),
  login: (payload) => client.post("/auth/login", payload),
  me: () => client.get("/auth/me"),
};

export const ragaApi = {
  list: (q = "") => client.get(`/ragas${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (name) => client.get(`/ragas/${encodeURIComponent(name)}`),
};

export const predictApi = {
  predict: (formData, signal) =>
    client.post("/predict", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal, // optional AbortController signal - undefined is a no-op, existing callers unaffected
    }),
};

export const historyApi = {
  list: () => client.get("/history"),
  remove: (id) => client.delete(`/history/${id}`),
  clearAll: () => client.delete("/history"),
};

export const dashboardApi = {
  stats: () => client.get("/dashboard/stats"),
};

export const adminApi = {
  listUsers: () => client.get("/admin/users"),
  updateUser: (id, payload) => client.patch(`/admin/users/${id}`, payload),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
  dataset: () => client.get("/admin/dataset"),
  uploadDatasetFile: (formData) =>
    client.post("/admin/dataset/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  retrain: () => client.post("/admin/retrain"),
  logs: () => client.get("/admin/logs"),
  stats: () => client.get("/admin/stats"),
};

// ── Keyboard / Swara API ─────────────────────────────────────────────────
export const keyboardApi = {
  /** Predict raga from an array of semitone values (0-11). */
  predict: (payload) => client.post("/keyboard/predict", payload),
  /** Fetch the swara → keyboard-key mapping. */
  swaraMap: () => client.get("/keyboard/swara-map"),
};
export const profileApi = {
  get: () => client.get("/profile"),
  update: (payload) => client.put("/profile", payload),
  changePassword: (payload) =>
    client.post("/profile/change-password", payload),
};
