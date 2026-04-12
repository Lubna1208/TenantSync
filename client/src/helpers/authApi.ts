export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export function getStoredToken() {
  const token = localStorage.getItem("ts_token");
  return typeof token === "string" && token.trim() ? token : null;
}

export function clearStoredAuth() {
  localStorage.removeItem("ts_user");
  localStorage.removeItem("ts_token");
  sessionStorage.removeItem("ts_user");
}

export function buildAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers ?? undefined);
  const token = getStoredToken();

  if (token && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function authFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), {
    ...init,
    credentials: init.credentials ?? "include",
    headers: buildAuthHeaders(init.headers),
  });
}
