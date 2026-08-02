import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiError, type ApiResponse, type AuthResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5215/api";

const ACCESS_TOKEN_KEY = "agrierp.accessToken";
const REFRESH_TOKEN_KEY = "agrierp.refreshToken";
const USER_KEY = "agrierp.user";

/*
 * Tokens live in localStorage.
 *
 * httpOnly cookies would be the stronger choice - localStorage is readable by
 * any script that gets injected into the page. It is used here because the API
 * and the web app are separate origins on the developer's machine and cookies
 * would need CORS credentials plus a shared parent domain. Revisit this before
 * exposing the shop to anything beyond the counter LAN.
 */
export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  save(auth: AuthResponse) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  saveUser(user: unknown) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  readUser<T>(): T | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  clear() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/*
 * Refresh is serialised.
 *
 * When an access token expires, several queries typically fail at once. Without
 * this queue each would fire its own refresh, and because the server ROTATES
 * refresh tokens - and treats reuse of a rotated one as theft - the second call
 * would revoke the whole session and log the user out mid-task. So the first
 * 401 refreshes, and everything else waits for that one result.
 */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) throw new Error("No refresh token");

  // A bare axios call, not `http`: the interceptor would attach the expired
  // access token and recurse straight back into this handler.
  const response = await axios.post<ApiResponse<AuthResponse>>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );

  const auth = response.data.data;
  if (!auth) throw new Error("Refresh returned no tokens");

  tokenStore.save(auth);
  return auth.accessToken;
}

function redirectToLogin() {
  tokenStore.clear();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    // Remember where they were so the login page can send them back.
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?from=${from}`;
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      // /auth/* failing with 401 means the credentials themselves are bad.
      // Retrying would loop.
      const isAuthCall = original.url?.includes("/auth/");

      if (!isAuthCall && tokenStore.refresh) {
        original._retried = true;
        try {
          refreshInFlight ??= refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
          const token = await refreshInFlight;
          original.headers.Authorization = `Bearer ${token}`;
          return http(original);
        } catch {
          redirectToLogin();
        }
      } else if (!isAuthCall) {
        redirectToLogin();
      }
    }

    const payload = error.response?.data;
    throw new ApiError(
      payload?.message ?? error.message ?? "Something went wrong.",
      status ?? 0,
      payload?.errors,
      payload?.traceId,
    );
  },
);

/** Unwraps the ApiResponse envelope so callers work with the payload directly. */
export async function apiGet<T>(url: string, params?: unknown): Promise<T> {
  const { data } = await http.get<ApiResponse<T>>(url, { params });
  return data.data as T;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.post<ApiResponse<T>>(url, body);
  return data.data as T;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.put<ApiResponse<T>>(url, body);
  return data.data as T;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const { data } = await http.delete<ApiResponse<T>>(url);
  return data.data as T;
}
