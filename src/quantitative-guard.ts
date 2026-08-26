const COUNTED_ARTIFACT = /\b\d[\d,]*\s+(?:files?|artifacts?|entries?|packages?)\b/i;
const COVERAGE_BASELINE = /\bcoverage(?:\s+floor|\s+threshold)?\b[^.\n]{0,60}\b(?:unchanged|preserved|maintained)\b(?:\s*\(\s*\d+(?:\.\d+)?%?\s*\))?/i;
const EMPTY_VALIDATION_STATE = /\b(?:pass(?:es|ed)?|succeed(?:s|ed)?|green|clean)\b[^.\n]{0,80}\b(?:with|using)\s+(?:an?\s+)?empty\s+(?:exception|exceptions|ignore|ignores|allowlist|allow-list|suppression|suppressions)\s+(?:set|list|manifest)?\b/i;

export const QUANTIFIED_COUNT_UNPROVEN_REASON =
  "A strengthened validation claim requires direct evidence for its stated count, state, or baseline, not only a successful check.";

export function requiresQuantifiedArtifactCountEvidence(text: string): boolean {
  return COUNTED_ARTIFACT.test(text)
    || COVERAGE_BASELINE.test(text)
    || EMPTY_VALIDATION_STATE.test(text);
}
