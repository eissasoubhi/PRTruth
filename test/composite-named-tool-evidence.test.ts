import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "step",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("composite named-tool evidence", () => {
  it("does not prove a composite PHPStan + Psalm + Rector claim from PHPStan alone", () => {
    const assessment = assessCompletionClaim(
      "PHPStan, Psalm and Rector checks passed",
      [check("quality / PHPStan", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("Psalm");
    expect(assessment.reason).toContain("Rector");
  });

  it("fails a composite claim when a named companion tool fails", () => {
    const assessment = assessCompletionClaim(
      "PHPStan, Psalm and Rector checks passed",
      [
        check("quality / PHPStan", "success"),
        check("quality / Psalm", "failure"),
        check("quality / Rector", "success")
      ]
    );

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("Psalm");
  });
});
