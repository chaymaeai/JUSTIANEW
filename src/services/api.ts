import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const TOKEN_KEY = "justia_token";
const REFRESH_KEY = "justia_refresh_token";
const USER_KEY = "justia_user";

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

export const api = axios.create({
  baseURL: apiBase,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function clearAuthAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/client-space/login";
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary when sending files.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string; detail?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      const url = original.url ?? "";
      if (url.includes("token/refresh")) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      const refresh = getRefreshToken();
      if (refresh) {
        original._retry = true;
        try {
          const { data } = await axios.post<{ access: string }>(`${apiBase}/auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem(TOKEN_KEY, data.access);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          clearAuthAndRedirect();
          return Promise.reject(error);
        }
      }
    }

    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Une erreur est survenue.") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string } | undefined;
    if (data?.message) return data.message;
    if (typeof data?.detail === "string") return data.detail;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
