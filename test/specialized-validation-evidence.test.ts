import { describe, expect, it } from "vitest";
import {
  guardSpecializedValidationClaim,
  guardSpecializedValidationRequirement
} from "../src/specialized-validation-evidence.js";
import type { CheckRunSummary, ClaimResult, RequirementResult } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

function provenClaim(text: string): ClaimResult {
  return {
    claim: { id: "claim-1", text, source: "checked-checklist" },
    status: "PROVEN",
    reason: "All observed test checks completed successfully.",
    evidence: [{ kind: "ci", summary: "Unit tests: success" }]
  };
}

function provenRequirement(text: string): RequirementResult {
  return {
    requirement: { id: "REQ-1", text, source: "issue-checklist" },
    status: "PROVEN",
    reason: "All observed test checks completed successfully.",
    evidence: [{ kind: "ci", summary: "Unit tests: success" }]
  };
}

describe("specialized validation evidence guard", () => {
  it("does not let generic green tests prove property tests when the exact lane is skipped", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Property tests pass with deterministic seeds and shrinking"),
      [
        check("Unit tests", "success"),
        check("Property and fuzz testing", "skipped")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("directly matching validation lane");
  });

  it("does not let generic green tests prove resilience tests when the exact lane is skipped", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Resilience tests pass, including fault-injection scenarios"),
      [
        check("Core tests", "success"),
        check("Resilience fault injection", "skipped")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("accepts direct successful specialized validation evidence", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Property tests pass with deterministic seeds and shrinking"),
      [
        check("Unit tests", "success"),
        check("Property and fuzz testing", "success")
      ]
    );

    expect(result.status).toBe("PROVEN");
  });

  it("applies the same ceiling to acceptance-criteria requirements", () => {
    const result = guardSpecializedValidationRequirement(
      provenRequirement("Health checks pass"),
      [
        check("Integration tests", "success"),
        check("Health checks", "skipped")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
  });
});
