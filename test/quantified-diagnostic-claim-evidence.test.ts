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

describe("quantified diagnostic claims", () => {
  it("keeps exact lint diagnostic counts unproven from a green lint check", () => {
    const assessment = assessCompletionClaim("lint: 0 errors (10 existing warnings)", [
      check("lint", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated count");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["lint"]);
  });

  it("keeps exact typecheck diagnostic counts unproven from a green typecheck", () => {
    const assessment = assessCompletionClaim("Typecheck passes with 0 errors", [
      check("typecheck", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated count");
  });

  it("preserves failure when a matching quantified diagnostic check fails", () => {
    const assessment = assessCompletionClaim("Lint passes with 0 warnings", [
      check("lint", "failure")
    ]);

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("lint");
  });

  it("still proves an unquantified lint success claim", () => {
    const assessment = assessCompletionClaim("Lint passes", [
      check("lint", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
  });
});
