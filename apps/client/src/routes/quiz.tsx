import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { client } from "@/api";
import { useState } from "react";

export function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const id = Number(quizId);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");

  const { data: quiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const res = await client.quizzes[":id"].$get({
        param: { id: String(id) },
      });
      return res.json();
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", id],
    queryFn: async () => {
      const res = await client.quizzes[":id"].questions.$get({
        param: { id: String(id) },
      });
      return res.json();
    },
  });

  const submit = useMutation({
    mutationFn: async (questionId: number) => {
      const res = await client.quizzes[":id"].answer.$post({
        param: { id: String(id) },
        json: { questionId, answer },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if ("correct" in data && data.correct && questions && index < questions.length - 1) {
        setIndex((i) => i + 1);
        setAnswer("");
      }
    },
  });

  if (isLoading)
    return <p style={{ color: "var(--color-text-muted)" }}>Loading questions…</p>;

  if (!questions || "error" in questions || questions.length === 0) {
    return (
      <p style={{ color: "var(--color-text-muted)" }}>No questions found.</p>
    );
  }

  const current = questions[index];
  if (!current)
    return (
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <h2 style={{ color: "var(--color-success)", marginBottom: "0.5rem" }}>
          Quiz Complete!
        </h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          Score:{" "}
          {quiz && "score" in quiz
            ? (quiz as unknown as { score: number | null }).score
            : "—"}
        </p>
      </div>
    );

  return (
    <div>
      <h1 style={{ marginBottom: "0.25rem", color: "var(--color-text)" }}>
        Quiz #{id}
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
        }}
      >
        Question {index + 1} of {questions.length}
        {quiz &&
          "seed" in quiz &&
          ` — Seed: ${(quiz as unknown as { seed: number }).seed}`}
      </p>

      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <img
          src={current.imageUrl}
          alt="Card"
          style={{
            maxWidth: "100%",
            borderRadius: "var(--radius)",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate(current.id);
        }}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Card name…"
          autoFocus
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          disabled={submit.isPending || !answer.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            background:
              submit.isPending || !answer.trim()
                ? "var(--color-border)"
                : "var(--color-primary)",
            color: "var(--mtg-white-950)",
            borderRadius: "var(--radius)",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          {submit.isPending ? "…" : "Submit"}
        </button>
      </form>

      {submit.isError && (
        <p style={{ color: "var(--color-danger)", marginTop: "0.75rem" }}>
          Wrong answer, try again.
        </p>
      )}
      {submit.isSuccess && "correct" in submit.data && submit.data.correct && (
        <p style={{ color: "var(--color-success)", marginTop: "0.75rem" }}>
          Correct!
        </p>
      )}
    </div>
  );
}
