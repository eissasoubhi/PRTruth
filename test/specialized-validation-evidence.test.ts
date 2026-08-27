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
  it("does not change ordinary property-test claims", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Property tests pass with deterministic seeds and shrinking"),
      [
        check("Property and fuzz testing", "skipped"),
        check("Core CI / Run property tests", "success")
      ]
    );

    expect(result.status).toBe("PROVEN");
  });

  it("requires every explicitly named resilience sub-scope to have direct success evidence", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Resilience tests pass, including applicable fault-injection and concurrency scenarios"),
      [
        check("Core CI / Run fast resilience tests", "success"),
        check("Resilience fault injection", "skipped"),
        check("Concurrency stress", "skipped")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("fault-injection testing");
    expect(result.reason).toContain("concurrency testing");
  });

  it("keeps a compound resilience claim proven when all named sub-scopes have direct successful evidence", () => {
    const result = guardSpecializedValidationClaim(
      provenClaim("Resilience tests pass, including applicable fault-injection and concurrency scenarios"),
      [
        check("Core CI / Run fast resilience tests", "success"),
        check("Resilience fault injection", "success"),
        check("Concurrency stress", "success")
      ]
    );

    expect(result.status).toBe("PROVEN");
  });

  it("applies the same compound-scope ceiling to acceptance-criteria requirements", () => {
    const result = guardSpecializedValidationRequirement(
      provenRequirement("Fault-injection and concurrency tests pass"),
      [
        check("Unit tests", "success"),
        check("Resilience fault injection", "success"),
        check("Concurrency stress", "skipped")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("concurrency testing");
  });

  it("does not let a generic test lane prove an explicit regression-test scenario", () => {
    const text = "Regression test — false green: an occurrences assertion whose only matches are inside a docstring evaluates FALSE";
    const result = guardSpecializedValidationRequirement(
      provenRequirement(text),
      [
        check("test", "success"),
        check("mutation-test", "success"),
        check("test / Run tests and verify count", "success")
      ]
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("explicit test scenario");
  });

  it("applies the explicit-scenario ceiling to completion claims too", () => {
    const text = "Regression test — false green: an occurrences assertion whose only matches are inside a docstring evaluates FALSE";
    const result = guardSpecializedValidationClaim(
      provenClaim(text),
      [check("unit tests", "success")]
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("explicit test scenario");
  });

  it("accepts directly matching successful evidence for an explicit regression-test scenario", () => {
    const text = "Regression test — false green: an occurrences assertion whose only matches are inside a docstring evaluates FALSE";
    const result = guardSpecializedValidationRequirement(
      provenRequirement(text),
      [check("false-green occurrences regression", "success")]
    );

    expect(result.status).toBe("PROVEN");
  });

  it("does not turn ordinary regression-test status into a scenario-specific requirement", () => {
    const result = guardSpecializedValidationRequirement(
      provenRequirement("Regression tests pass"),
      [check("regression tests", "success")]
    );

    expect(result.status).toBe("PROVEN");
  });

  it("does not affect unrelated health-check requirements", () => {
    const result = guardSpecializedValidationRequirement(
      provenRequirement("Health checks pass"),
      [check("Health checks", "skipped")]
    );

    expect(result.status).toBe("PROVEN");
  });
});
