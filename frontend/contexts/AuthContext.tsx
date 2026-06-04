import React, { createContext, useContext, useState } from "react";

const TOKEN_KEY    = "finance_auth_token";
const USER_ID_KEY  = "finance_auth_user_id";
const EMAIL_KEY    = "finance_auth_email";
const NAME_KEY     = "finance_auth_name";

interface AuthUser {
  id: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, userId: number, email: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const id    = localStorage.getItem(USER_ID_KEY);
    const email = localStorage.getItem(EMAIL_KEY) ?? "";
    const name  = localStorage.getItem(NAME_KEY) ?? "";
    return id ? { id: Number(id), email, name } : null;
  });

  const login = (newToken: string, userId: number, email: string, name = "") => {
    localStorage.setItem(TOKEN_KEY,   newToken);
    localStorage.setItem(USER_ID_KEY, String(userId));
    localStorage.setItem(EMAIL_KEY,   email);
    localStorage.setItem(NAME_KEY,    name);
    setToken(newToken);
    setUser({ id: userId, email, name });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(NAME_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
