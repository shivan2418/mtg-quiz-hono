import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/use-auth";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card } from "@/components/card";

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
    <Card className="max-w-md mx-auto mt-16">
      <h1 className="text-xl font-bold text-center text-mtg-white-100 mb-6">
        {isRegister ? "Register" : "Sign In"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isRegister && (
          <Input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isRegister ? "new-password" : "current-password"}
        />

        {error && (
          <p className="text-mtg-red-400 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "…" : isRegister ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <p className="mt-4 text-center text-mtg-white-500 text-sm">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="bg-transparent text-mtg-green-400 underline text-sm cursor-pointer"
        >
          {isRegister ? "Sign in" : "Register"}
        </button>
      </p>
    </Card>
  );
}
