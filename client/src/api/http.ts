const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getAccessToken() {
  return sessionStorage.getItem("accessToken");
}

function setAccessToken(token: string) {
  sessionStorage.setItem("accessToken", token);
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

function setRefreshToken(token: string) {
  localStorage.setItem("refreshToken", token);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as { accessToken: string; refreshToken?: string };
      setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

type RequestOptions = {
  retryOn401?: boolean;
};

async function request<T>(path: string, init: RequestInit = {}, opts: RequestOptions = {}): Promise<T> {
  const retryOn401 = opts.retryOn401 ?? true;

  const headers = new Headers(init.headers);

  // Content-Type רק אם זה לא FormData
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  // Authorization
  const at = getAccessToken();
  if (at && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${at}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // אם 401 - לנסות refresh פעם אחת ואז retry
  if (res.status === 401 && retryOn401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);

      return request<T>(path, { ...init, headers: retryHeaders }, { retryOn401: false });
    }
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new HttpError(res.status, msg || `${res.status} ${res.statusText}`);
  }

  // במידה ויש endpoints שמחזירים 204 בעתיד
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ ok: true }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ accessToken: string; refreshToken?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  refresh: () =>
    request<{ accessToken: string; refreshToken?: string }>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      },
      { retryOn401: false }
    ),

  me: () => request<import("../types/models").User>("/auth/me"),

  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
};
