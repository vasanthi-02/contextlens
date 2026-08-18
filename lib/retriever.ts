import { Chunk } from "./chunker";
import { estimateTokens } from "./tokens";

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","of","to","in","on","for",
  "and","or","how","what","why","does","do","this","that","it","with","as",
  "at","by","from","i","my","me","can","you","your",
]);

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Simple lexical scoring: term frequency in the chunk + a bonus if a query
// term appears in the file path (e.g. asking about "auth" should surface
// auth.ts even if the word "auth" isn't repeated much inside it).
function scoreChunk(chunk: Chunk, terms: string[]): number {
  if (terms.length === 0) return 0;
  const lowerText = chunk.text.toLowerCase();
  const lowerPath = chunk.path.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const matches = lowerText.match(re);
    if (matches) score += matches.length;
    if (lowerPath.includes(term)) score += 3;
  }
  return score;
}

export interface RankedSelection {
  selected: Chunk[];
  totalRepoTokens: number;
  sentTokens: number;
  totalChunks: number;
}

export function selectRelevantChunks(
  allChunks: Chunk[],
  query: string,
  extraTerms: string[],
  tokenBudget: number
): RankedSelection {
  const terms = [...tokenizeQuery(query), ...extraTerms.map((t) => t.toLowerCase())];
  const totalRepoTokens = allChunks.reduce((sum, c) => sum + estimateTokens(c.text), 0);

  const scored = allChunks
    .map((c) => ({ chunk: c, score: scoreChunk(c, terms) }))
    .sort((a, b) => b.score - a.score);

  const selected: Chunk[] = [];
  let sentTokens = 0;

  for (const { chunk, score } of scored) {
    if (score <= 0 && selected.length > 0) break; // don't pad with irrelevant chunks
    const t = estimateTokens(chunk.text);
    if (sentTokens + t > tokenBudget && selected.length > 0) continue;
    selected.push(chunk);
    sentTokens += t;
    if (sentTokens >= tokenBudget) break;
  }

  // If nothing scored (e.g. vague question), fall back to the first few chunks
  // so the agent still has *something* to work with.
  if (selected.length === 0 && allChunks.length > 0) {
    for (const chunk of allChunks) {
      const t = estimateTokens(chunk.text);
      if (sentTokens + t > tokenBudget && selected.length > 0) break;
      selected.push(chunk);
      sentTokens += t;
    }
  }

  return { selected, totalRepoTokens, sentTokens, totalChunks: allChunks.length };
}
