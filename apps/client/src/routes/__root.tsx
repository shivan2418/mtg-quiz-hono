import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Root() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--color-primary)",
          }}
        >
          MTG Quiz
        </Link>
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {user ? (
            <>
              <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                {user.email}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                style={{
                  padding: "0.4rem 1rem",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  color: "var(--color-text)",
                  fontSize: "0.875rem",
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              style={{
                padding: "0.4rem 1rem",
                background: "var(--color-primary)",
                borderRadius: "var(--radius)",
                color: "var(--mtg-white-950)",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
        <Outlet />
      </main>
    </>
  );
}
