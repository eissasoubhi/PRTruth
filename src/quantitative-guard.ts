const COUNTED_ARTIFACT = /\b\d[\d,]*\s+(?:files?|artifacts?|entries?|packages?)\b/i;

export const QUANTIFIED_COUNT_UNPROVEN_REASON =
  "A quantitative validation claim requires evidence for the stated value, not only a successful check.";

export function requiresQuantifiedArtifactCountEvidence(text: string): boolean {
  return COUNTED_ARTIFACT.test(text);
}
