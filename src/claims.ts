import type { CompletionClaim } from "./types.js";

const CLAIM_SECTION = /^(?:#{1,6}\s+)?(?:completion claims?|claims?|validation|what changed|changes|implemented|included|done)\s*:??\s*$/i;
const HEADING = /^#{1,6}\s+/;
const VALIDATION_TERM = /\b(?:ci|tests?|test suite|lint(?:ing)?|type[ -]?check|typescript|build|compile|compilation|install(?:ation)?|dependencies)\b/i;
const SUCCESS_TERM = /\b(?:pass(?:es|ed|ing)?|succeed(?:s|ed|ing)?|success(?:ful(?:ly)?)?|green|complete(?:s|d|ing)?)\b/i;
const FAILURE_TERM = /\b(?:fail(?:s|ed|ing|ure)?|broken|red)\b/i;
const NEGATED_SUCCESS_TERM = /\b(?:(?:did|does|do|has|have|is|are|was|were|can)\s+not|never|didn't|doesn't|don't|hasn't|haven't|isn't|aren't|wasn't|weren't|cannot|can't)\s+(?:pass(?:es|ed|ing)?|succeed(?:s|ed|ing)?|complete(?:s|d|ing)?)\b/i;
const NON_SUCCESS_VALIDATION_TERM = /\b(?:skip(?:s|ped|ping)?|pending)\b|\b(?:(?:did|does|do|has|have|is|are|was|were)\s+not|didn't|doesn't|don't|hasn't|haven't|isn't|aren't|wasn't|weren't)\s+(?:run|execut(?:e|ed)|start(?:ed)?|perform(?:ed)?|verif(?:y|ied)|check(?:ed)?)\b/i;

function cleanItem(value: string): string {
  return value
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .trim();
}

function looksLikeValidationProse(value: string): boolean {
  return VALIDATION_TERM.test(value)
    && SUCCESS_TERM.test(value)
    && !NEGATED_SUCCESS_TERM.test(value)
    && !NON_SUCCESS_VALIDATION_TERM.test(value);
}

function looksLikeFailureReport(value: string): boolean {
  return VALIDATION_TERM.test(value)
    && (FAILURE_TERM.test(value) || NEGATED_SUCCESS_TERM.test(value) || NON_SUCCESS_VALIDATION_TERM.test(value))
    && !looksLikeValidationProse(value);
}

export function extractCompletionClaims(body: string): CompletionClaim[] {
  if (!body.trim()) return [];

  const lines = body.split(/\r?\n/);
  const claims: CompletionClaim[] = [];
  let inClaimSection = false;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) continue;

    if (HEADING.test(trimmed)) {
      const headingText = trimmed.replace(HEADING, "").trim();
      inClaimSection = CLAIM_SECTION.test(headingText);
      continue;
    }

    const checked = trimmed.match(/^[-*+]\s+\[[xX]\]\s+(.+)$/);
    if (checked) {
      const text = cleanItem(checked[1] ?? "");
      if (!looksLikeFailureReport(text)) {
        claims.push({
          id: `claim-${claims.length + 1}`,
          text,
          source: "checked-checklist"
        });
      }
      continue;
    }

    if (!inClaimSection) continue;

    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const text = cleanItem(trimmed);
      if (text.length >= 4 && !looksLikeFailureReport(text)) {
        claims.push({
          id: `claim-${claims.length + 1}`,
          text,
          source: "claim-section"
        });
      }
      continue;
    }

    if (looksLikeValidationProse(trimmed)) {
      claims.push({
        id: `claim-${claims.length + 1}`,
        text: trimmed,
        source: "claim-section"
      });
    }
  }

  return claims;
}
