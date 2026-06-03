import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";

export function SignIn() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = isRegister
      ? await register(email, password, name || undefined)
      : await login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate("/");
    } else {
      setError(result.error ?? "Something went wrong");
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "4rem auto",
        padding: "2rem",
        background: "var(--color-surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
          textAlign: "center",
          color: "var(--color-text)",
        }}
      >
        {isRegister ? "Register" : "Sign In"}
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {isRegister && (
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isRegister ? "new-password" : "current-password"}
        />

        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem",
            background: loading
              ? "var(--color-border)"
              : "var(--color-primary)",
            color: "var(--mtg-white-950)",
            borderRadius: "var(--radius)",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          {loading ? "…" : isRegister ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p
        style={{
          marginTop: "1rem",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: "0.875rem",
        }}
      >
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          style={{
            background: "none",
            color: "var(--color-primary)",
            textDecoration: "underline",
            fontSize: "0.875rem",
          }}
        >
          {isRegister ? "Sign in" : "Register"}
        </button>
      </p>
    </div>
  );
}
