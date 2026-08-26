const EXPLICIT_GATE_EXCLUSION = /\b(?:(?:is|are|was|were)\s+)?(?:explicitly\s+)?(?:not\s+part\s+of|excluded\s+from|out\s+of\s+scope\s+for|not\s+required\s+(?:by|for))\b[^.!?]{0,160}\b(?:gate|validation|verification)\b/i;

/**
 * Return only the text that is relevant when deciding which CI scopes a
 * requirement or completion claim actually demands.
 *
 * An acceptance criterion may deliberately document a validation that is
 * outside the automated gate, for example: "VRT is explicitly NOT part of
 * the agent-side verify gate; it runs on Windows at review time." Platform
 * names inside that excluded clause must not become required CI scopes.
 *
 * The original requirement text is kept everywhere else; this helper is only
 * for evidence matching. If an exclusion starts after a semicolon, text before
 * that semicolon is retained so a real scope such as "Tests pass on Windows;
 * Linux is excluded from the CI gate" still requires Windows evidence.
 */
export function evidenceGateText(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];

  return sentences
    .map((sentence) => {
      const exclusion = sentence.search(EXPLICIT_GATE_EXCLUSION);
      if (exclusion < 0) return sentence.trim();

      const semicolon = sentence.lastIndexOf(";", exclusion);
      if (semicolon < 0) return "";
      return sentence.slice(0, semicolon).trim();
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}
