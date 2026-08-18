"use client";

import { useState } from "react";
import { SAMPLE_REPO } from "@/lib/sample";

interface Stats {
  totalRepoTokens: number;
  sentTokens: number;
  reductionPct: number;
  chunksUsed: number;
  chunksTotal: number;
}

interface Turn {
  question: string;
  answer: string;
  plan: string[];
  stats: Stats;
  filesUsed: string[];
}

export default function Home() {
  const [repo, setRepo] = useState(SAMPLE_REPO);
  const [question, setQuestion] = useState("Where is the login rate limit enforced?");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setTurns((prev) => [
        { question, answer: data.answer, plan: data.plan, stats: data.stats, filesUsed: data.filesUsed },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="border-b border-border px-6 py-3 flex items-baseline gap-3">
        <h1 className="text-lg font-semibold text-white">ContextLens</h1>
        <p className="text-sm text-gray-500">
          A tiny agent + context-compression engine — paste code, ask a question, see what it actually sends the model.
        </p>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: "repo" input */}
        <section className="w-1/2 border-r border-border flex flex-col">
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-border">
            Repo (paste files, marked with <code>### path/to/file.ts</code>)
          </div>
          <textarea
            className="flex-1 bg-panel text-gray-200 font-mono text-sm p-4 outline-none resize-none"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            spellCheck={false}
          />
        </section>

        {/* Right pane: chat + stats */}
        <section className="w-1/2 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex gap-2">
            <input
              className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about the code above..."
              onKeyDown={(e) => e.key === "Enter" && !loading && ask()}
            />
            <button
              onClick={ask}
              disabled={loading}
              className="bg-accent text-black font-medium text-sm px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>

          {error && (
            <div className="mx-4 mt-3 text-sm text-red-400 border border-red-900 bg-red-950/40 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
            {turns.length === 0 && !loading && (
              <p className="text-sm text-gray-600">
                Ask a question to see the agent plan its search, compress the repo down to a
                token budget, and answer from only that slice.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className="border border-border rounded-lg p-4 bg-panel/60">
                <p className="text-sm font-medium text-white mb-2">Q: {t.question}</p>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <StatBox label="Repo tokens" value={t.stats.totalRepoTokens.toLocaleString()} />
                  <StatBox label="Sent to model" value={t.stats.sentTokens.toLocaleString()} />
                  <StatBox label="Context reduction" value={`${t.stats.reductionPct}%`} accent />
                  <StatBox
                    label="Chunks used"
                    value={`${t.stats.chunksUsed} / ${t.stats.chunksTotal}`}
                  />
                </div>

                {t.plan.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2">
                    Agent's search plan: {t.plan.map((p) => `"${p}"`).join(", ")}
                  </p>
                )}
                {t.filesUsed.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">Files consulted: {t.filesUsed.join(", ")}</p>
                )}

                <div className="text-sm whitespace-pre-wrap text-gray-200">{t.answer}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border rounded px-2 py-1.5">
      <div className="text-gray-500">{label}</div>
      <div className={accent ? "text-accent font-semibold" : "text-gray-200 font-semibold"}>
        {value}
      </div>
    </div>
  );
}
