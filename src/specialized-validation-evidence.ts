import type { CheckRunSummary, ClaimResult, RequirementResult } from "./types.js";

interface SpecializedValidationFamily {
  label: string;
  claimPattern: RegExp;
  checkPattern: RegExp;
}

const SPECIALIZED_VALIDATION_FAMILIES: SpecializedValidationFamily[] = [
  {
    label: "property/fuzz testing",
    claimPattern: /\bproperty\s+tests?\b|\bfuzz(?:ing)?\b/i,
    checkPattern: /\bproperty\b|\bfuzz(?:ing)?\b/i
  },
  {
    label: "resilience/fault-injection testing",
    claimPattern: /\bresilience\s+tests?\b|\bfault[- ]injection\b/i,
    checkPattern: /\bresilience\b|\bfault[- ]injection\b/i
  },
  {
    label: "health checks",
    claimPattern: /\bhealth[- ]?checks?\b/i,
    checkPattern: /\bhealth[- ]?checks?\b|\bhealth\b/i
  }
];

function matchingFamily(text: string): SpecializedValidationFamily | null {
  return SPECIALIZED_VALIDATION_FAMILIES.find((family) => family.claimPattern.test(text)) ?? null;
}

function hasSuccessfulDirectEvidence(family: SpecializedValidationFamily, checks: CheckRunSummary[]): boolean {
  return checks.some((check) =>
    family.checkPattern.test(check.name)
    && check.status === "completed"
    && check.conclusion === "success"
  );
}

function directEvidenceReason(family: SpecializedValidationFamily): string {
  return `A ${family.label} claim requires a successful directly matching validation lane; generic green CI or a skipped matching lane is not execution evidence.`;
}

export function guardSpecializedValidationClaim(
  result: ClaimResult,
  checks: CheckRunSummary[]
): ClaimResult {
  if (result.status !== "PROVEN") return result;

  const family = matchingFamily(result.claim.text);
  if (!family || hasSuccessfulDirectEvidence(family, checks)) return result;

  return {
    ...result,
    status: "UNPROVEN",
    reason: directEvidenceReason(family)
  };
}

export function guardSpecializedValidationRequirement(
  result: RequirementResult,
  checks: CheckRunSummary[]
): RequirementResult {
  if (result.status !== "PROVEN") return result;

  const family = matchingFamily(result.requirement.text);
  if (!family || hasSuccessfulDirectEvidence(family, checks)) return result;

  return {
    ...result,
    status: "UNPROVEN",
    reason: directEvidenceReason(family)
  };
}
