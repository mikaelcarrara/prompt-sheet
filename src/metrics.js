function estimateTokens(text) {
  if (!text) return 0;
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  // Simple heuristic: ~4 characters per token
  const byChars = Math.ceil(chars / 4);
  // Alternative heuristic: ~1.3 words per token
  const byWords = Math.ceil(words / 1.3);
  return Math.max(byChars, byWords);
}

function enforceTokenLimit(text, maxTokens) {
  if (!maxTokens || maxTokens <= 0) return { text, tokens: estimateTokens(text), truncated: false };
  const tokens = estimateTokens(text);
  if (tokens <= maxTokens) return { text, tokens, truncated: false };
  // Truncate by characters approximating tokens*4
  const maxChars = Math.max(1, Math.floor(maxTokens * 4));
  const truncatedText = text.slice(0, maxChars) + '\n\n[...truncated for token budget]';
  return { text: truncatedText, tokens: estimateTokens(truncatedText), truncated: true };
}

module.exports = {
  estimateTokens,
  enforceTokenLimit,
};
