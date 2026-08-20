import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, scope: "check" | "step" = "step"): CheckRunSummary {
  return { name, conclusion, status: "completed", scope };
}

describe("PHP quality tool evidence", () => {
  it("proves Pint, PHPStan, Rector and Pest only from explicitly named evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Pint, PHPStan, Rector --dry-run and the full Pest suite pass",
      [
        check("Run Pint", "success"),
        check("Run PHPStan", "success"),
        check("Run Rector", "success"),
        check("Run Pest", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Run Pint",
      "Run PHPStan",
      "Run Rector",
      "Run Pest"
    ]);
  });

  it("does not let generic lint and test lanes prove named PHP tools", () => {
    const assessment = assessGenericCiSuccess(
      "Pint, Rector and Pest pass",
      [
        check("Lint", "success"),
        check("Static analysis", "success"),
        check("Tests", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("pint");
    expect(assessment?.reason).toContain("rector");
    expect(assessment?.reason).toContain("pest");
  });

  it("fails when an explicitly named tool lane fails", () => {
    const assessment = assessGenericCiSuccess(
      "Pint and Rector checks pass",
      [
        check("Run Pint", "success"),
        check("Run Rector", "failure")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Run Rector");
  });
});
