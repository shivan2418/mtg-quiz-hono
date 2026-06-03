import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  id: number;
  email: string;
  name: string | null;
  admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );

  useEffect(() => {
    if (token) {
      const u = decodePayload(token);
      if (u) setUser(u);
      else {
        localStorage.removeItem("token");
        setToken(null);
      }
    }
  }, [token]);

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

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
