import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi } from "../lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("ws_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ws_access_token");
    if (token) {
      authApi
        .me()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("ws_user", JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem("ws_access_token");
          localStorage.removeItem("ws_refresh_token");
          localStorage.removeItem("ws_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { access_token, refresh_token, user: u } = res.data;
    localStorage.setItem("ws_access_token", access_token);
    localStorage.setItem("ws_refresh_token", refresh_token);
    localStorage.setItem("ws_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, password: string, full_name: string) => {
    const res = await authApi.register(email, password, full_name);
    const { access_token, refresh_token, user: u } = res.data;
    localStorage.setItem("ws_access_token", access_token);
    localStorage.setItem("ws_refresh_token", refresh_token);
    localStorage.setItem("ws_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    const rt = localStorage.getItem("ws_refresh_token");
    if (rt) authApi.logout(rt).catch(() => {});
    localStorage.removeItem("ws_access_token");
    localStorage.removeItem("ws_refresh_token");
    localStorage.removeItem("ws_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
