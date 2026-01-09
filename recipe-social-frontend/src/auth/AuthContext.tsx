import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type { User } from "../types/models";

type AuthState = {
  user: User | null;
  loading: boolean;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function setTokens(accessToken: string, refreshToken?: string) {
    sessionStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }

  async function restore() {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await restore();
      setLoading(false);
    })();
  }, []);

  async function login(username: string, password: string) {
    const t = await api.login(username, password);
    setTokens(t.accessToken, t.refreshToken);
    await restore();
  }

  async function logout() {
    try {
      await api.logout();
    } catch {}
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, setTokens, login, logout }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
