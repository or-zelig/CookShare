import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api/http";
import type { User } from "../types/models";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function restore() {
    try {
      const me = await api.me(); // כולל refresh אוטומטי ב-http.ts
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
    await api.login(username, password);
    await restore();
  }

  async function register(username: string, email: string, password: string) {
    await api.register(username, email, password);
    await restore();
  }

  async function loginWithGoogle(credential: string) {
    await api.google(credential);
    await restore();
  }

  async function logout() {
    try {
      await api.logout();
    } catch {}
    sessionStorage.removeItem("accessToken");
    setUser(null);
  }

  async function refresh() {
    await restore();
  }

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout, refresh }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
