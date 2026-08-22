import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("raga_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("raga_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("raga_token");
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.me();
        setUser(res.data.user);
        localStorage.setItem("raga_user", JSON.stringify(res.data.user));
      } catch {
        localStorage.removeItem("raga_token");
        localStorage.removeItem("raga_user");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem("raga_token", res.data.token);
    localStorage.setItem("raga_user", JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // Registration intentionally does NOT sign the user in.
  // After creating an account the user is sent to the Sign in page.
  const register = useCallback(async (username, email, password) => {
    const res = await authApi.register({ username, email, password });
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("raga_token");
    localStorage.removeItem("raga_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
