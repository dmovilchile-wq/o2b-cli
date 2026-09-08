// Token count is ALWAYS an estimate here (label as such in any report).
// Heuristic: ~4 characters per token, a widely used rough approximation for
// English/code text. This is not a real tokenizer and must never be
// presented as an exact measurement.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
