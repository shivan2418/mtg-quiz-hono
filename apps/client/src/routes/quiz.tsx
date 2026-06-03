import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { client } from "@/api";
import { useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card } from "@/components/card";

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
      const res = await client.answer.$post({
        json: { quizId: id, questionId, answer },
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
    return <p className="text-mtg-white-500">Loading questions…</p>;

  if (!questions || "error" in questions || questions.length === 0) {
    return <p className="text-mtg-white-500">No questions found.</p>;
  }

  const current = questions[index];
  if (!current)
    return (
      <div className="text-center mt-12">
        <h2 className="text-mtg-green-400 text-2xl font-bold mb-2">
          Quiz Complete!
        </h2>
        <p className="text-mtg-white-500">
          Score:{" "}
          {quiz && "score" in quiz
            ? (quiz as unknown as { score: number | null }).score
            : "—"}
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-mtg-white-100 mb-1">
        Quiz #{id}
      </h1>
      <p className="text-mtg-white-500 text-sm mb-6">
        Question {index + 1} of {questions.length}
        {quiz &&
          "seed" in quiz &&
          ` — Seed: ${(quiz as unknown as { seed: number }).seed}`}
      </p>

      <Card className="mb-6">
        <img
          src={current.imageUrl}
          alt="Card"
          className="max-w-full rounded-(--radius) block mx-auto"
        />
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate(current.id);
        }}
        className="flex gap-2"
      >
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Card name…"
          autoFocus
          className="flex-1"
        />
        <Button type="submit" disabled={submit.isPending || !answer.trim()}>
          {submit.isPending ? "…" : "Submit"}
        </Button>
      </form>

      {submit.isError && (
        <p className="text-mtg-red-400 mt-3">Wrong answer, try again.</p>
      )}
      {submit.isSuccess && "correct" in submit.data && submit.data.correct && (
        <p className="text-mtg-green-400 mt-3">Correct!</p>
      )}
    </div>
  );
}
