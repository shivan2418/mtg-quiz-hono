import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { client } from "@/api";
import { useState, useRef, useEffect } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card } from "@/components/card";

interface Result {
  questionIndex: number;
  guess: string | null;
  correct: boolean;
  correctAnswer: string;
  imageUrl: string;
}

export function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const id = quizId!;
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong"; correctAnswer: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: quiz, refetch: refetchQuiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const res = await client.quizzes[":id"].$get({
        param: { id },
      });
      return res.json();
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", id],
    queryFn: async () => {
      const res = await client.quizzes[":id"].questions.$get({
        param: { id },
      });
      return res.json();
    },
  });

  const [debouncedAnswer] = useDebouncedValue(answer, { wait: 100 });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["autocomplete", debouncedAnswer],
    queryFn: async () => {
      const res = await client.autocomplete.$get({
        query: { q: debouncedAnswer },
      });
      return res.json();
    },
    enabled: debouncedAnswer.length >= 3,
    placeholderData: keepPreviousData,
  });

  const selectSuggestion = (title: string) => {
    setAnswer(title);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const q = questions?.[quiz && "currentIndex" in quiz ? (quiz as { currentIndex: number }).currentIndex : 0];
      if (!q) throw new Error("No question");
      const res = await client.answer.$post({
        json: { quizId: id, questionId: q.id, answer },
      });
      return { data: await res.json(), question: q };
    },
    onSuccess: ({ data }) => {
      setOpen(false);
      refetchQuiz();
      const d = data as { correct?: boolean; correctAnswer?: string };
      const cardName = d.correctAnswer ?? "";
      if (d.correct) {
        setFeedback({ kind: "correct", correctAnswer: cardName });
      } else {
        setFeedback({ kind: "wrong", correctAnswer: cardName });
      }
      setTimeout(() => {
        setFeedback(null);
        setAnswer("");
      }, 1500);
    },
  });

  // Close autocomplete dropdown when clicking outside the input container
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const currentIndex = quiz && "currentIndex" in quiz ? (quiz as { currentIndex: number }).currentIndex : 0;
  const current = questions?.[currentIndex];
  const isPending = submit.isPending || !!feedback;

  // Auto-focus the input when the question changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  if (isLoading)
    return <p className="text-mtg-white-500">Loading questions…</p>;

  if (!questions || "error" in questions || questions.length === 0) {
    return <p className="text-mtg-white-500">No questions found.</p>;
  }

  if (quiz && "completed" in quiz && quiz.completed) {
    return (
      <ResultsScreen
        results={(quiz as { results: Result[] }).results ?? []}
        total={questions.length}
        score={(quiz as { score: number }).score ?? 0}
      />
    );
  }

  if (!current) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-mtg-white-100 mb-1">
        Quiz #{id.slice(0, 8)}
      </h1>
      <p className="text-mtg-white-500 text-sm mb-6">
        Question {currentIndex + 1} of {questions.length}
        {quiz &&
          "seed" in quiz &&
          ` — Seed: ${(quiz as { seed: number }).seed}`}
      </p>

      <Card key={currentIndex} className="mb-6" style={{ animation: 'fade-in 750ms ease-out' }}>
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
          submit.mutate();
        }}
        className="flex gap-2"
      >
        <div ref={containerRef} className="flex-1 relative">
          <Input
            ref={inputRef}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setOpen(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                if (!submit.isPending && answer.trim()) submit.mutate();
                return;
              }
              if (!open || suggestions.length === 0) return;
              if (e.key === "ArrowDown" || e.key === "Tab") {
                e.preventDefault();
                setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((i) => Math.max(i - 1, -1));
              } else if (e.key === "Enter" && highlightIndex >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[highlightIndex]!);
              } else if (e.key === "Escape") {
                setOpen(false);
                setHighlightIndex(-1);
              }
            }}
            placeholder="Card name…"
            autoFocus
            disabled={submit.isPending}
            className="w-full"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-mtg-white-900 border border-mtg-white-700 rounded-(--radius) shadow-lg z-10 max-h-56 overflow-y-auto">
              {suggestions.map((title, i) => (
                <li
                  key={title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(title);
                  }}
                  className={`px-4 py-2 cursor-pointer text-mtg-white-200 text-sm ${
                    i === highlightIndex
                      ? "bg-mtg-green-800 text-mtg-white-100"
                      : "hover:bg-mtg-white-800"
                  }`}
                >
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={isPending || !answer.trim()}>
          {submit.isPending ? "…" : "Submit"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            submit.mutate();
          }}
        >
          Skip
        </Button>
      </form>

      {feedback?.kind === "correct" && (
        <p className="text-mtg-green-400 mt-3 font-medium">
          Correct!{" "}
          <span className="text-mtg-green-300">{feedback.correctAnswer}</span>
        </p>
      )}
      {feedback?.kind === "wrong" && (
        <p className="text-mtg-red-400 mt-3 font-medium">
          Wrong — it was{" "}
          <span className="text-mtg-white-300">{feedback.correctAnswer}</span>
        </p>
      )}

      {submit.isError && !feedback && (
        <p className="text-mtg-red-400 mt-3">Something went wrong. Try again.</p>
      )}
    </div>
  );
}

function ResultsScreen({
  results,
  total,
  score,
}: {
  results: Result[];
  total: number;
  score: number;
}) {
  const [visible, setVisible] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [modal, setModal] = useState<string | null>(null);

  // Reset animation state when the results screen mounts
  useEffect(() => {
    setVisible(0);
    setDisplayScore(0);
  }, []);

  // Reveal result cards one at a time with a 100ms stagger
  useEffect(() => {
    if (visible < results.length) {
      const timer = setTimeout(() => setVisible((v) => v + 1), 100);
      return () => clearTimeout(timer);
    }
  }, [visible, results.length]);

  // Animate the score counter counting up from 0 to the final score
  useEffect(() => {
    if (displayScore < score) {
      const timer = setTimeout(() => setDisplayScore((s) => s + 1), 80);
      return () => clearTimeout(timer);
    }
  }, [displayScore, score]);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-mtg-white-950 pt-2 pb-4 mb-6 border-b border-mtg-white-800">
        <h2 className="text-2xl font-bold text-center text-mtg-white-100 mb-1">
          Results
        </h2>
        <p className="text-center text-3xl font-bold text-mtg-green-400">
          {displayScore} / {total}
        </p>
        <p className="text-center text-mtg-white-500 text-sm mt-1">
          {score === total
            ? "Perfect!"
            : score >= total / 2
              ? "Well played!"
              : "Keep practicing!"}
        </p>
        <div className="text-center mt-3">
          <Link
            to="/"
            className="inline-flex px-4 py-2 bg-mtg-green-600 text-mtg-white-950 rounded-(--radius) font-semibold text-sm hover:bg-mtg-green-500 transition-colors"
          >
            Back to quizzes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
        {results.map((r, i) => {
          const show = i < visible;
          return (
            <div
              key={i}
              className={`flex flex-col items-center transition-all duration-300 ${
                show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <div className="relative w-full">
                <img
                  src={r.imageUrl}
                  alt=""
                  className="w-full rounded-(--radius-sm) block cursor-pointer hover:ring-2 hover:ring-mtg-green-500 transition-all"
                  onClick={() => setModal(r.imageUrl)}
                />
                <span
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    r.correct
                      ? "bg-mtg-green-500 text-mtg-white-950"
                      : "bg-mtg-red-500 text-mtg-white-950"
                  }`}
                >
                  {r.correct ? "✓" : "✗"}
                </span>
              </div>
              <p className="text-mtg-white-400 text-xs mt-1 text-center leading-tight truncate w-full">
                {r.correct ? r.guess : (r.correctAnswer ?? "?")}
              </p>
              {!r.correct && r.guess && (
                <p className="text-mtg-red-400 text-xs text-center leading-tight truncate w-full line-through">
                  {r.guess}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setModal(null)}
        >
          <img
            src={modal}
            alt=""
            className="max-h-[90vh] max-w-full rounded-(--radius) shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
