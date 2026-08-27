import type { CheckRunSummary, ClaimResult, RequirementResult } from "./types.js";

interface RequiredValidationEvidence {
  label: string;
  matchesCheck(name: string): boolean;
}

const TEST_SCENARIO_STOP_WORDS = new Set([
  "test", "tests", "regression", "unit", "integration", "e2e", "end", "the", "and", "that", "this",
  "with", "whose", "only", "inside", "still", "when", "must", "should"
]);

function regexEvidence(label: string, pattern: RegExp): RequiredValidationEvidence {
  return {
    label,
    matchesCheck: (name: string) => pattern.test(name)
  };
}

function explicitTestScenarioEvidence(text: string): RequiredValidationEvidence | null {
  const match = text.match(
    /\b(?:regression|unit|integration|e2e|end[- ]to[- ]end)\s+tests?\s*(?:—|–|-|:)\s*([^\n]{3,220})/i
  );
  const scenario = match?.[1];
  if (!scenario) return null;

  const tokens = [...new Set(
    scenario
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !TEST_SCENARIO_STOP_WORDS.has(token))
  )].slice(0, 6);

  return {
    label: "explicit test scenario",
    matchesCheck: (name: string) => {
      if (tokens.length < 2) return false;
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      return tokens.filter((token) => new RegExp(`\\b${token}\\b`, "i").test(normalizedName)).length >= 2;
    }
  };
}

function requiredCompoundValidationEvidence(text: string): RequiredValidationEvidence[] {
  const requirements: RequiredValidationEvidence[] = [];

  // These are deliberately narrow sub-scopes. A broader successful test or
  // resilience lane must not silently prove an explicitly named stress/fault
  // scenario that GitHub never executed on the exact PR head.
  if (/\bfault[- ]injection\b/i.test(text)) {
    requirements.push(regexEvidence("fault-injection testing", /\bfault[- ]injection\b/i));
  }

  if (/\bconcurrenc(?:y|ies)\b/i.test(text)) {
    requirements.push(regexEvidence("concurrency testing", /\bconcurrenc(?:y|ies)\b/i));
  }

  const explicitScenario = explicitTestScenarioEvidence(text);
  if (explicitScenario) requirements.push(explicitScenario);

  return requirements;
}

function hasSuccessfulDirectEvidence(
  requirement: RequiredValidationEvidence,
  checks: CheckRunSummary[]
): boolean {
  return checks.some((check) =>
    requirement.matchesCheck(check.name)
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
