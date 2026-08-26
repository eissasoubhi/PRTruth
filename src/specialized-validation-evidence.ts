import type { CheckRunSummary, ClaimResult, RequirementResult } from "./types.js";

interface RequiredValidationEvidence {
  label: string;
  checkPattern: RegExp;
}

function requiredCompoundValidationEvidence(text: string): RequiredValidationEvidence[] {
  const requirements: RequiredValidationEvidence[] = [];

  // These are deliberately narrow sub-scopes. A broader successful test or
  // resilience lane must not silently prove an explicitly named stress/fault
  // scenario that GitHub never executed on the exact PR head.
  if (/\bfault[- ]injection\b/i.test(text)) {
    requirements.push({
      label: "fault-injection testing",
      checkPattern: /\bfault[- ]injection\b/i
    });
  }

  if (/\bconcurrenc(?:y|ies)\b/i.test(text)) {
    requirements.push({
      label: "concurrency testing",
      checkPattern: /\bconcurrenc(?:y|ies)\b/i
    });
  }

  return requirements;
}

function hasSuccessfulDirectEvidence(
  requirement: RequiredValidationEvidence,
  checks: CheckRunSummary[]
): boolean {
  return checks.some((check) =>
    requirement.checkPattern.test(check.name)
    && check.status === "completed"
    && check.conclusion === "success"
  );
}

function guardResult<T extends ClaimResult | RequirementResult>(
  result: T,
  text: string,
  checks: CheckRunSummary[]
): T {
  if (result.status !== "PROVEN") return result;

  const required = requiredCompoundValidationEvidence(text);
  if (required.length === 0) return result;

  const missing = required.filter((requirement) => !hasSuccessfulDirectEvidence(requirement, checks));
  if (missing.length === 0) return result;

  return {
    ...result,
    status: "UNPROVEN",
    reason: `This completion statement explicitly names validation sub-scopes without directly matching successful execution evidence: ${missing.map((requirement) => requirement.label).join(", ")}. Generic or partial green CI cannot prove those clauses.`
  } as T;
}

export function guardSpecializedValidationClaim(
  result: ClaimResult,
  checks: CheckRunSummary[]
): ClaimResult {
  return guardResult(result, result.claim.text, checks);
}

export function guardSpecializedValidationRequirement(
  result: RequirementResult,
  checks: CheckRunSummary[]
): RequirementResult {
  return guardResult(result, result.requirement.text, checks);
}
