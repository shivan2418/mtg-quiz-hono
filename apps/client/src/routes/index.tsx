import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { client } from "@/api";
import { useAuth } from "@/use-auth";
import { Button } from "@/components/button";
import { Link } from "@/components/link";

export function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await client.quizzes.$get();
      return res.json();
    },
  });

  const createQuiz = useMutation({
    mutationFn: async () => {
      const res = await client.quizzes.$post({
        json: { seed: Math.floor(Math.random() * 100000) },
        header: user
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {},
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      if ("quiz" in data) {
        navigate(`/quiz/${data.quiz.id}`);
      }
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-mtg-white-100">Quizzes</h1>
        {user && (
          <Button
            onClick={() => createQuiz.mutate()}
            disabled={createQuiz.isPending}
          >
            {createQuiz.isPending ? "Creating…" : "New Quiz"}
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-mtg-white-500">Loading…</p>
      )}

      {quizzes && quizzes.length === 0 && (
        <p className="text-mtg-white-500">
          No quizzes yet. Sign in and create one, or run the seed script.
        </p>
      )}

      <ul className="flex flex-col gap-3 list-none">
        {quizzes?.map((quiz) => (
          <li key={quiz.id}>
            <Link to={`/quiz/${quiz.id}`} variant="card">
              <strong>Quiz #{quiz.id}</strong>
              <span className="ml-4 text-mtg-white-500">
                Seed: {quiz.seed}
                {quiz.completed && ` — Score: ${quiz.score ?? "—"}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
