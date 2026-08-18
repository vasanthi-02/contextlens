import { chunkRepo, parsePastedRepo, RepoFile } from "./chunker";
import { selectRelevantChunks } from "./retriever";
import { callClaude } from "./claude";

const TOKEN_BUDGET = 3000; // tokens of code context we allow into the final call

export interface AgentResult {
  answer: string;
  plan: string[];
  stats: {
    totalRepoTokens: number;
    sentTokens: number;
    reductionPct: number;
    chunksUsed: number;
    chunksTotal: number;
  };
  filesUsed: string[];
}

// Step 1: a cheap "triage" call. The agent looks only at file paths + the
// question (not the full code) and decides what to search for. This is the
// harness deciding *where to look* before it pays for full context — the
// same job Superbrain's agent layer does before invoking its context engine.
async function planSearch(paths: string[], question: string): Promise<string[]> {
  const system =
    "You are a search-planning step inside a coding agent. Given a list of file " +
    "paths and a user question, output ONLY a JSON array of up to 6 short " +
    "keywords or identifiers (function names, filenames, concepts) worth " +
    "searching for in the code to answer the question. No prose, no markdown, " +
    'just JSON, e.g. ["auth","login","token"].';
  const user = `Files:\n${paths.join("\n")}\n\nQuestion: ${question}`;

  try {
    const raw = await callClaude(system, user, 150);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, 6);
    return [];
  } catch {
    return []; // triage is a nice-to-have; retrieval still works without it
  }
}

// Step 2: answer using only the retrieved, budgeted context.
async function answerWithContext(
  question: string,
  contextBlock: string
): Promise<string> {
  const system =
    "You are a coding assistant answering questions about a codebase. You are " +
    "shown only a relevant subset of files (marked with path and line ranges), " +
    "not the whole repo. Answer using only this context. If something isn't in " +
    "the provided context, say so plainly instead of guessing. When suggesting " +
    "a code change, use a fenced code block and reference the file path.";
  const user = `Context:\n${contextBlock}\n\nQuestion: ${question}`;
  return callClaude(system, user, 800);
}

export async function runAgent(rawRepo: string, question: string): Promise<AgentResult> {
  const files: RepoFile[] = parsePastedRepo(rawRepo);
  const chunks = chunkRepo(files);
  const paths = files.map((f) => f.path);

  const plan = await planSearch(paths, question);

  const { selected, totalRepoTokens, sentTokens, totalChunks } = selectRelevantChunks(
    chunks,
    question,
    plan,
    TOKEN_BUDGET
  );

  const contextBlock = selected
    .map((c) => `### ${c.path} (lines ${c.startLine}-${c.endLine})\n${c.text}`)
    .join("\n\n");

  const answer = await answerWithContext(question, contextBlock || "(no matching code found)");

  const reductionPct =
    totalRepoTokens === 0 ? 0 : Math.round((1 - sentTokens / totalRepoTokens) * 100);

  return {
    answer,
    plan,
    stats: {
      totalRepoTokens,
      sentTokens,
      reductionPct,
      chunksUsed: selected.length,
      chunksTotal: totalChunks,
    },
    filesUsed: [...new Set(selected.map((c) => c.path))],
  };
}
