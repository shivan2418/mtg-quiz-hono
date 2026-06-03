import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { client } from "@/api";
import { useAuth } from "@/use-auth";
import { Button } from "@/components/button";
import { Link } from "@/components/link";
import { useLocalStorage } from "usehooks-ts";

const FORMAT_NAMES: Record<string, string> = {
  classic: "Classic",
  middle: "Middle Era",
  custom: "Custom",
};

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [localIds] = useLocalStorage<string[]>("quizIds", []);

  const serverQuizzes = useQuery({
    queryKey: ["quizzes", user?.id],
    queryFn: async () => {
      const res = await client.quizzes.$get({
        query: { userId: String(user!.id) },
      });
      return res.json();
    },
    enabled: !!user,
  });

  const localResults = useQueries({
    queries: localIds.map((id) => ({
      queryKey: ["quiz", id],
      queryFn: async () => {
        const res = await client.quizzes[":id"].$get({ param: { id } });
        return res.json();
      },
    })),
  });

  const isLoading = user ? serverQuizzes.isLoading : localResults.some((q: { isLoading: boolean }) => q.isLoading);
  const quizzes = user
    ? serverQuizzes.data
    : localResults.filter((q: { data?: Record<string, unknown> }) => "id" in (q.data ?? {})).map((q) => q.data);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-mtg-white-100">Quizzes</h1>
        <Button onClick={() => navigate("/create")}>
          New Quiz
        </Button>
      </div>

      {isLoading && (
        <p className="text-mtg-white-500">Loading…</p>
      )}

      {quizzes && quizzes.length === 0 && !isLoading && (
        <p className="text-mtg-white-500">
          No quizzes yet. Create one to get started.
        </p>
      )}

      <ul className="flex flex-col gap-3 list-none">
        {quizzes?.map((quiz: Record<string, unknown> | undefined) => {
          if (!quiz) return null;
          return (
            <li key={(quiz as { id: string }).id}>
              <Link
                to={`/quiz/${(quiz as { id: string }).id}`}
                variant="card"
              >
                <strong>Quiz #{(quiz as { id: string }).id.slice(0, 8)}</strong>
                <span className="ml-4 text-mtg-white-500">
                  {FORMAT_NAMES[(quiz as { format?: string }).format ?? "classic"] ??
                    ((quiz as { format?: string }).format ?? "Classic")}
                  {" · "}Seed: {(quiz as { seed: number }).seed}
                  {(quiz as { completedAt: string | null }).completedAt !== null
                    ? ` — Score: ${(quiz as { score: number | null }).score ?? "—"}`
                    : ` — ${(quiz as { currentIndex: number }).currentIndex}/${(quiz as { questionCount: number }).questionCount}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
