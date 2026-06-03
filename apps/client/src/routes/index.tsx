import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { client } from "@/api";
import { useAuth } from "@/auth";

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "2rem", color: "var(--color-text)" }}>
          Quizzes
        </h1>
        {user && (
          <button
            onClick={() => createQuiz.mutate()}
            disabled={createQuiz.isPending}
            style={{
              padding: "0.6rem 1.25rem",
              background: createQuiz.isPending
                ? "var(--color-border)"
                : "var(--color-primary)",
              color: "var(--mtg-white-950)",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            {createQuiz.isPending ? "Creating…" : "New Quiz"}
          </button>
        )}
      </div>

      {isLoading && <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}

      {quizzes && quizzes.length === 0 && (
        <p style={{ color: "var(--color-text-muted)" }}>
          No quizzes yet. Sign in and create one, or run the seed script.
        </p>
      )}

      <ul
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {quizzes?.map((quiz) => (
          <li key={quiz.id}>
            <Link
              to={`/quiz/${quiz.id}`}
              style={{
                display: "block",
                padding: "1rem 1.25rem",
                background: "var(--color-surface)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
              }}
            >
              <strong>Quiz #{quiz.id}</strong>
              <span
                style={{ marginLeft: "1rem", color: "var(--color-text-muted)" }}
              >
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
