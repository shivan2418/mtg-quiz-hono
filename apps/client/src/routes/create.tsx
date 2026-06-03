import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { client } from "@/api";
import { useAuth } from "@/use-auth";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@/components/button";

interface SetInfo {
  code: string;
  name: string;
  year: string;
  totalCards: number;
  uniqueArtwork: number;
}

export function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, setLocalIds] = useLocalStorage<string[]>("quizIds", []);

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ["sets"],
    queryFn: async () => {
      const res = await client.sets.$get();
      return res.json();
    },
  });

  const toggleSet = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const totalArtwork = useMemo(
    () =>
      sets
        .filter((s: SetInfo) => selected.has(s.code))
        .reduce((sum: number, s: SetInfo) => sum + s.uniqueArtwork, 0),
    [sets, selected],
  );

  const createQuiz = useMutation({
    mutationFn: async () => {
      const setCodes = [...selected];
      const seed = Math.floor(Math.random() * 100000);
      const headers: Record<string, string> = {};
      if (user) {
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await client.quizzes.$post(
        { json: { seed, setCodes } },
        { headers },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if ("quiz" in data) {
        const quiz = data.quiz as { id: string };
        if (!user) {
          setLocalIds((prev) => [...prev, quiz.id]);
        }
        navigate(`/quiz/${quiz.id}`);
      }
    },
  });

  const canCreate = selected.size > 0 && !createQuiz.isPending;

  if (isLoading) {
    return <p className="text-mtg-white-500">Loading sets…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-mtg-white-100">New Quiz</h1>
          <p className="text-mtg-white-500 mt-1">
            {selected.size > 0
              ? `${selected.size} set${selected.size > 1 ? "s" : ""} selected — ${totalArtwork.toLocaleString()} unique artworks`
              : "Select sets to create a quiz from"}
          </p>
        </div>
        <Button onClick={() => createQuiz.mutate()} disabled={!canCreate}>
          {createQuiz.isPending ? "Creating…" : `Start Quiz (${selected.size})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sets.map((s: SetInfo) => {
          const on = selected.has(s.code);
          return (
            <button
              key={s.code}
              onClick={() => toggleSet(s.code)}
              className={`flex items-center gap-3 p-3 rounded-(--radius) border text-left transition-all cursor-pointer ${
                on
                  ? "border-mtg-green-500 bg-mtg-green-950/40 ring-1 ring-mtg-green-500/50"
                  : "border-mtg-white-800 hover:border-mtg-white-700 bg-mtg-white-950/60"
              }`}
            >
              <img
                src={`/set-logos/${s.code}.svg`}
                alt={s.code}
                className="w-8 h-8 shrink-0 invert"
              />
              <div className="min-w-0 flex-1">
                <div className="text-mtg-white-200 font-medium text-sm truncate">
                  {s.name}
                </div>
                <div className="text-mtg-white-500 text-xs">
                  {s.year} — {s.uniqueArtwork.toLocaleString()} artworks
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  on
                    ? "bg-mtg-green-500 border-mtg-green-500"
                    : "border-mtg-white-600"
                }`}
              >
                {on && (
                  <svg className="w-3 h-3 text-mtg-white-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {createQuiz.isError && (
        <p className="text-mtg-red-400 mt-4">Failed to create quiz. Try again.</p>
      )}
    </div>
  );
}
