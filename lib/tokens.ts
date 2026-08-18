// Rough token estimate. Real tokenizers vary by model; ~4 chars/token
// is the standard back-of-envelope approximation used across the industry
// for English + code. Good enough for showing relative compression, which
// is the point here — not exact billing accuracy.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
