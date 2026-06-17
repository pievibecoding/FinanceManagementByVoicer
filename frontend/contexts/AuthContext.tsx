import React, { createContext, useContext, useState, useEffect } from "react";

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
  isLoading: boolean;
  login: (token: string, userId: number, email: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_AUTH_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";
const DEV_AUTH_EMAIL = import.meta.env.VITE_DEV_AUTH_EMAIL;
const DEV_AUTH_PASSWORD = import.meta.env.VITE_DEV_AUTH_PASSWORD;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const id    = localStorage.getItem(USER_ID_KEY);
    const email = localStorage.getItem(EMAIL_KEY) ?? "";
    const name  = localStorage.getItem(NAME_KEY) ?? "";
    return id ? { id: Number(id), email, name } : null;
  });

  // Verify stored token against server on initial load to catch expired/revoked tokens
  useEffect(() => {
    let cancelled = false;

    const clearAuthState = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(EMAIL_KEY);
      localStorage.removeItem(NAME_KEY);
      setToken(null);
      setUser(null);
    };

    const applyAuthState = (
      newToken: string,
      userId: number,
      email: string,
      name = ""
    ) => {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_ID_KEY, String(userId));
      localStorage.setItem(EMAIL_KEY, email);
      localStorage.setItem(NAME_KEY, name);
      setToken(newToken);
      setUser({ id: userId, email, name });
    };

    const signInWithDevAuth = () => {
      if (!DEV_AUTH_ENABLED || !DEV_AUTH_EMAIL || !DEV_AUTH_PASSWORD) {
        return false;
      }

      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DEV_AUTH_EMAIL,
          password: DEV_AUTH_PASSWORD,
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error("Dev auth login failed");
          return res.json();
        })
        .then(data => {
          if (cancelled) return;
          const email = data.email ?? DEV_AUTH_EMAIL;
          const name = data.username ?? data.name ?? email;
          applyAuthState(data.access_token, data.user_id, email, name);
        })
        .catch(error => {
          if (cancelled) return;
          console.warn("Dev auth bypass failed:", error);
          clearAuthState();
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return true;
    };

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      if (!signInWithDevAuth()) {
        setIsLoading(false);
      }
      return;
    }

    let devAuthStarted = false;

    fetch("/api/auth/me", {
      headers: { "Authorization": `Bearer ${storedToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json();
      })
      .then(data => {
        // Refresh user info from server in case it changed
        setUser({
          id: data.user_id,
          email: data.email ?? "",
          name: data.username ?? data.email ?? "",
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Token expired or server unreachable — clear auth state
        clearAuthState();
        devAuthStarted = signInWithDevAuth();
      })
      .finally(() => {
        if (!cancelled && !devAuthStarted) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string, userId: number, email: string, name = "") => {
    console.log('AuthContext.login called with:', { userId, email, name });
    localStorage.setItem(TOKEN_KEY,   newToken);
    localStorage.setItem(USER_ID_KEY, String(userId));
    localStorage.setItem(EMAIL_KEY,   email);
    localStorage.setItem(NAME_KEY,    name);
    setToken(newToken);
    setUser({ id: userId, email, name });
    console.log('AuthContext state updated:', { token: newToken, user: { id: userId, email, name } });
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
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
