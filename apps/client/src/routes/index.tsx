import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { client } from "@/api";
import { useAuth } from "@/use-auth";
import { Button } from "@/components/button";
import { Link } from "@/components/link";
import { useLocalStorage } from "usehooks-ts";

export function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [localIds, setLocalIds] = useLocalStorage<string[]>("quizIds", []);

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

  const isLoading = user ? serverQuizzes.isLoading : localResults.some((q) => q.isLoading);
  const quizzes = user
    ? serverQuizzes.data
    : localResults.filter((q) => "id" in (q.data ?? {})).map((q) => q.data);

  const createQuiz = useMutation({
    mutationFn: async () => {
      const seed = Math.floor(Math.random() * 100000);
      const headers: Record<string, string> = {};
      if (user) {
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await client.quizzes.$post(
        { json: { seed } },
        { headers },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if ("quiz" in data) {
        const quiz = data.quiz as { id: string };
        if (!user) {
          setLocalIds((prev) => [...prev, quiz.id]);
        } else {
          queryClient.invalidateQueries({ queryKey: ["quizzes", user.id] });
        }
        navigate(`/quiz/${quiz.id}`);
      }
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-mtg-white-100">Quizzes</h1>
        <Button
          onClick={() => createQuiz.mutate()}
          disabled={createQuiz.isPending}
        >
          {createQuiz.isPending ? "Creating…" : "New Quiz"}
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
        {quizzes?.map((quiz) => (
          <li key={(quiz as { id: string }).id}>
            <Link
              to={`/quiz/${(quiz as { id: string }).id}`}
              variant="card"
            >
              <strong>Quiz #{(quiz as { id: string }).id.slice(0, 8)}</strong>
              <span className="ml-4 text-mtg-white-500">
                Seed: {(quiz as { seed: number }).seed}
                {(quiz as { completed: boolean }).completed &&
                  ` — Score: ${(quiz as { score: number | null }).score ?? "—"}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
