import { useState, useCallback, useMemo, type ReactNode } from "react";
import { AuthContext } from "./use-auth";
import type { User } from "./use-auth";

function decodePayload(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    return {
      id: payload.id as number,
      email: payload.email as string,
      name: (payload.name as string) ?? null,
      admin: (payload.admin as boolean) ?? false,
    };
  } catch {
    return null;
  }
}

function getInitialToken(): string | null {
  return localStorage.getItem("token");
}

function getInitialUser(): User | null {
  const token = getInitialToken();
  return token ? decodePayload(token) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [user, setUser] = useState<User | null>(getInitialUser);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error ?? "Login failed" };
      }
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(decodePayload(data.token));
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Registration failed" };
        }
        return login(email, password);
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, login, register, logout }),
    [user, token, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
