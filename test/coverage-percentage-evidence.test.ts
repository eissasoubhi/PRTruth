import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("coverage percentage evidence", () => {
  it("keeps a real mixed validation claim unproven when the exact coverage percentage is not evidenced", () => {
    const assessment = assessCompletionClaim(
      "passed; 489 application tests, 20 Functions tests, and 91.91% application coverage",
      [check("application tests", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated value");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["application tests"]);
  });

  it("keeps coverage-first percentage wording unproven from a generic green test check", () => {
    const assessment = assessCompletionClaim(
      "Tests pass with coverage at 87.5%",
      [check("tests", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated value");
  });

  it("preserves failure precedence for quantified coverage claims", () => {
    const assessment = assessCompletionClaim(
      "Tests pass with 91.91% application coverage",
      [check("tests", "failure")]
    );

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("tests");
  });

  it("does not weaken an ordinary unquantified test-success claim", () => {
    expect(
      assessCompletionClaim("Tests pass", [check("tests", "success")]).status
    ).toBe("PROVEN");
  });
});
