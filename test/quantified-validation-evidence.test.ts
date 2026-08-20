import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status };
}

describe("quantitative validation evidence", () => {
  it("does not let a generic green test check prove an exact test count", () => {
    const assessment = assessCompletionClaim(
      "CLI unit tests — 43 files / 542 tests passed",
      [check("Unit Test", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated count");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["Unit Test"]);
  });

  it("keeps slash-style executed counts unproven without count-bearing evidence", () => {
    const assessment = assessCompletionClaim(
      "Unit tests: 7/7 passed",
      [check("unit tests", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated count");
  });

  it("still reports a quantified success claim as failed when its matching check failed", () => {
    const assessment = assessCompletionClaim(
      "CLI unit tests — 43 files / 542 tests passed",
      [check("Unit Test", "failure")]
    );

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("Unit Test");
  });

  it("does not confuse runtime or database versions with quantitative test counts", () => {
    expect(
      assessCompletionClaim(
        "Node 22 tests passed",
        [check("tests / Node 22", "success")]
      ).status
    ).toBe("PROVEN");

    expect(
      assessCompletionClaim(
        "PostgreSQL 17 tests passed",
        [check("tests / PostgreSQL 17", "success")]
      ).status
    ).toBe("PROVEN");
  });
});
