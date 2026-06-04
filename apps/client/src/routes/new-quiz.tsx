import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { client } from "@/api";
import { useAuth } from "@/use-auth";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@/components/button";

interface FormatInfo {
  id: string;
  name: string;
  description: string;
  setCodes: string[];
  uniqueArtwork: number;
  lastSet: string;
}

export function NewQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, setLocalIds] = useLocalStorage<string[]>("quizIds", []);

  const { data: formats = [], isLoading } = useQuery({
    queryKey: ["formats"],
    queryFn: async () => {
      const res = await client.formats.$get();
      return res.json();
    },
  });

  const createQuiz = useMutation({
    mutationFn: async (formatId: string) => {
      const seed = Math.floor(Math.random() * 100000);
      const headers: Record<string, string> = {};
      if (user) {
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await client.quizzes.$post(
        { json: { seed, formatId } },
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

  const visible = formats.filter((f: FormatInfo) => f.id === "standard" || f.id === "classic");

  if (isLoading) {
    return <p className="text-mtg-white-500">Loading formats…</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-mtg-white-100">New Quiz</h1>
        <p className="text-mtg-white-500 mt-1">Choose a format to start a quiz</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((f: FormatInfo) => (
          <button
            key={f.id}
            onClick={() => createQuiz.mutate(f.id)}
            disabled={createQuiz.isPending}
            className={`flex flex-col gap-2 p-5 rounded-(--radius) border text-left transition-all cursor-pointer ${
              f.id === "standard"
                ? "border-mtg-white-600 bg-mtg-white-950/40 hover:bg-mtg-white-950/70"
                : "border-mtg-white-800 hover:border-mtg-white-700 bg-mtg-white-950/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-mtg-white-100 font-semibold text-lg">
                {f.name}
              </h2>
              <span className="text-mtg-white-500 text-sm">
                {f.uniqueArtwork.toLocaleString()} artworks
              </span>
            </div>
            <p className="text-mtg-white-500 text-sm leading-relaxed">
              {f.id === "standard" && f.lastSet ? `Alpha through ${f.lastSet}` : f.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-mtg-white-600 text-xs">
                {f.setCodes.length} set{f.setCodes.length > 1 ? "s" : ""}
              </span>
              {createQuiz.isPending && (
                <span className="text-mtg-green-400 text-xs">Creating…</span>
              )}
            </div>
          </button>
        ))}

        <Link
          to="/customQuiz"
          className="flex flex-col gap-2 p-5 rounded-(--radius) border border-dashed border-mtg-white-800 text-left transition-all hover:border-mtg-green-500 hover:bg-mtg-green-950/20"
        >
          <h2 className="text-mtg-white-300 font-semibold text-lg">
            Custom Set Selection
          </h2>
          <p className="text-mtg-white-500 text-sm leading-relaxed">
            Hand-pick specific sets for your quiz
          </p>
        </Link>
      </div>

      {createQuiz.isError && (
        <p className="text-mtg-red-400 mt-4">Failed to create quiz. Try again.</p>
      )}
    </div>
  );
}
