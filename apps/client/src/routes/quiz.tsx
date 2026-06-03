import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { client } from "@/api";
import { useState, useRef } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card } from "@/components/card";

type Feedback =
  | null
  | { kind: "correct" }
  | { kind: "wrong"; correctAnswer: string };

export function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const id = Number(quizId);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const advance = () => {
    if (questions && index < questions.length - 1) {
      setIndex((i) => i + 1);
      setAnswer("");
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setFinished(true);
      setFeedback(null);
    }
  };

  const submit = useMutation({
    mutationFn: async (questionId: number) => {
      const res = await client.answer.$post({
        json: { quizId: id, questionId, answer },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if ("correct" in data && data.correct) {
        setScore((s) => s + 1);
        setFeedback({ kind: "correct" });
      } else if ("correctAnswer" in data) {
        setFeedback({ kind: "wrong", correctAnswer: data.correctAnswer });
      }
      setTimeout(advance, 1500);
    },
  });

  if (isLoading)
    return <p className="text-mtg-white-500">Loading questions…</p>;

  if (!questions || "error" in questions || questions.length === 0) {
    return <p className="text-mtg-white-500">No questions found.</p>;
  }

  if (finished) {
    return (
      <div className="text-center mt-12">
        <h2 className="text-mtg-green-400 text-2xl font-bold mb-2">
          Quiz Complete!
        </h2>
        <p className="text-mtg-white-200 text-lg mt-2">
          {score} / {questions.length} correct
        </p>
        <p className="text-mtg-white-500 mt-1">
          {score === questions.length
            ? "Perfect score!"
            : score >= questions.length / 2
              ? "Well played!"
              : "Keep practicing!"}
        </p>
      </div>
    );
  }

  const current = questions[index];
  if (!current) return null;

  const isPending = submit.isPending || !!feedback;

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
          if (isPending) return;
          submit.mutate(current.id);
        }}
        className="flex gap-2"
      >
        <Input
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Card name…"
          autoFocus
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || !answer.trim()}>
          {submit.isPending ? "…" : "Submit"}
        </Button>
      </form>

      {feedback?.kind === "correct" && (
        <p className="text-mtg-green-400 mt-3 font-medium">Correct!</p>
      )}
      {feedback?.kind === "wrong" && (
        <p className="text-mtg-red-400 mt-3 font-medium">
          Wrong — it was <span className="text-mtg-white-300">{feedback.correctAnswer}</span>
        </p>
      )}

      {submit.isError && !feedback && (
        <p className="text-mtg-red-400 mt-3">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
