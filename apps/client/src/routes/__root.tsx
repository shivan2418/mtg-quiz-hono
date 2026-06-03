import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/button";
import { Link } from "@/components/link";
import { useAuth } from "@/use-auth";

export function Root() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="flex justify-between items-center px-8 py-4 border-b border-mtg-white-800 bg-mtg-white-900">
        <Link
          to="/"
          className="text-xl font-bold text-mtg-green-400!"
          variant="default"
        >
          MTG Quiz
        </Link>
        <nav className="flex gap-4 items-center">
          {user ? (
            <>
              <span className="text-mtg-white-500 text-sm">{user.email}</span>
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <Link to="/signin">
              <Button variant="primary">Sign in</Button>
            </Link>
          )}
        </nav>
      </header>
      <main className="max-w-2xl mx-auto my-8 px-4">
        <Outlet />
      </main>
    </>
  );
}
