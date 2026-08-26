import type { CheckRunSummary, ClaimResult, RequirementResult } from "./types.js";

interface RequiredValidationEvidence {
  label: string;
  checkPattern: RegExp;
}

function requiredValidationEvidence(text: string): RequiredValidationEvidence[] {
  const requirements: RequiredValidationEvidence[] = [];

  if (/\bproperty\s+tests?\b|\bfuzz(?:ing)?\b/i.test(text)) {
    requirements.push({
      label: "property/fuzz testing",
      checkPattern: /\bproperty\b|\bfuzz(?:ing)?\b/i
    });
  }

  if (/\bresilience\s+tests?\b|\bresilience\b/i.test(text)) {
    requirements.push({
      label: "resilience testing",
      checkPattern: /\bresilience\b/i
    });
  }

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

  if (/\bhealth[- ]?checks?\b/i.test(text)) {
    requirements.push({
      label: "health checks",
      checkPattern: /\bhealth[- ]?checks?\b|\bhealth\b/i
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

function missingDirectEvidence(text: string, checks: CheckRunSummary[]): RequiredValidationEvidence[] {
  return requiredValidationEvidence(text).filter(
    (requirement) => !hasSuccessfulDirectEvidence(requirement, checks)
  );
}

function directEvidenceReason(missing: RequiredValidationEvidence[]): string {
  const labels = missing.map((requirement) => requirement.label).join(", ");
  return `This claim requires directly matching successful validation for: ${labels}. Generic green CI or skipped matching lanes are not execution evidence for those clauses.`;
}

export function guardSpecializedValidationClaim(
  result: ClaimResult,
  checks: CheckRunSummary[]
): ClaimResult {
  if (result.status !== "PROVEN") return result;

  const required = requiredValidationEvidence(result.claim.text);
  if (required.length === 0) return result;

  const missing = missingDirectEvidence(result.claim.text, checks);
  if (missing.length === 0) return result;

  return {
    ...result,
    status: "UNPROVEN",
    reason: directEvidenceReason(missing)
  };
}

export function guardSpecializedValidationRequirement(
  result: RequirementResult,
  checks: CheckRunSummary[]
): RequirementResult {
  if (result.status !== "PROVEN") return result;

  const required = requiredValidationEvidence(result.requirement.text);
  if (required.length === 0) return result;

  const missing = missingDirectEvidence(result.requirement.text, checks);
  if (missing.length === 0) return result;

  return {
    ...result,
    status: "UNPROVEN",
    reason: directEvidenceReason(missing)
  };
}
