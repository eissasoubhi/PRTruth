import type { CompletionClaim } from "./types.js";

const CLAIM_SECTION = /^(?:#{1,6}\s+)?(?:completion claims?|claims?|validation|what changed|changes|implemented|included|done)\s*:??\s*$/i;
const HEADING = /^#{1,6}\s+/;

function cleanItem(value: string): string {
  return value
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .trim();
}

function looksLikeValidationProse(value: string): boolean {
  return /\b(?:ci|tests?|test suite|lint(?:ing)?|type[ -]?check|typescript|build|compile|compilation|install(?:ation)?|dependencies)\b/i.test(value)
    && /\b(?:pass(?:es|ed)?|succeed(?:s|ed)?|success(?:ful(?:ly)?)?|green|complete(?:s|d)?|fail(?:s|ed|ure)?)\b/i.test(value);
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
      claims.push({
        id: `claim-${claims.length + 1}`,
        text: cleanItem(checked[1] ?? ""),
        source: "checked-checklist"
      });
      continue;
    }

    if (!inClaimSection) continue;

    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const text = cleanItem(trimmed);
      if (text.length >= 4) {
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
