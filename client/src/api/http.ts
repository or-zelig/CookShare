const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type ServerUser = {
  id?: string;
  _id?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
};

function resolveMediaUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("/")) return `${API_URL}${url}`;
  return url;
}

function getAccessToken() {
  return sessionStorage.getItem("accessToken") || "";
}

function setAccessToken(token: string) {
  sessionStorage.setItem("accessToken", token);
}

function clearAccessToken() {
  sessionStorage.removeItem("accessToken");
}

// כדי למנוע כמה refresh במקביל
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { accessToken: string; user: ServerUser };
      if (!data?.accessToken) return null;

      setAccessToken(data.accessToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: { retryOn401?: boolean } = {}
): Promise<T> {
  const retryOn401 = opts.retryOn401 ?? true;

  const headers = new Headers(init.headers);

  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // חשוב בשביל ה-rt cookie
  });

  if (res.status === 401 && retryOn401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return request<T>(path, { ...init, headers: retryHeaders }, { retryOn401: false });
    } else {
      clearAccessToken();
    }
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function mapUser(u: ServerUser) {
  return {
    id: u.id ?? u._id ?? "",
    username: u.username,
    email: u.email ?? "",
    avatarUrl: resolveMediaUrl(u.avatarUrl),
  };
}

export const api = {
  resolveMediaUrl,
  async uploadImage(file: File) {
    const form = new FormData();
    form.append("file", file);
    const data = await request<{ url: string }>("/uploads", {
      method: "POST",
      body: form,
    });
    return data.url;
  },
  async updateMe(data: { username?: string; avatarUrl?: string }) {
    const payload: { username?: string; avatarUrl?: string } = {};
    if (data.username) payload.username = data.username;
    if (data.avatarUrl) payload.avatarUrl = data.avatarUrl;
    return request<{ user: ServerUser }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async register(username: string, email: string, password: string) {
    const data = await request<{
      user: ServerUser;
      accessToken: string;
      accessTokenExpiresAt?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });

    setAccessToken(data.accessToken);
    return { user: mapUser(data.user), accessToken: data.accessToken };
  },

  async login(username: string, password: string) {
    const data = await request<{
      user: ServerUser;
      accessToken: string;
      accessTokenExpiresAt?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setAccessToken(data.accessToken);
    return { user: mapUser(data.user), accessToken: data.accessToken };
  },

  async google(credential: string) {
    const data = await request<{
      user: ServerUser;
      accessToken: string;
      accessTokenExpiresAt?: string;
    }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });

    setAccessToken(data.accessToken);
    return { user: mapUser(data.user), accessToken: data.accessToken };
  },

  async me() {
    // אצלך זה מחזיר { user: {...} } בקובץ auth.ts
    const data = await request<{ user: ServerUser }>("/auth/me");
    return mapUser(data.user);
  },

  async logout() {
    const data = await request<{ ok: true }>("/auth/logout", { method: "POST" }, { retryOn401: false });
    clearAccessToken();
    return data;
  },
};
