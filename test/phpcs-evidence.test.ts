import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import { assessGenericCiSuccess, isGenericCiSuccessStatement } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("PHPCS evidence", () => {
  it("proves a clean PHPCS claim from explicit PHPCS evidence", () => {
    const checks = [
      check("phpcs", "success"),
      check("phpcs / PHPCS", "success", "step"),
      check("Lint", "success")
    ];

    expect(isGenericCiSuccessStatement("PHPCS — clean")).toBe(true);
    expect(assessGenericCiSuccess("PHPCS — clean", checks)).toMatchObject({
      status: "PROVEN"
    });
    expect(assessCompletionClaim("PHPCS — clean", checks)).toMatchObject({
      status: "PROVEN"
    });
  });

  it("does not infer PHPCS from a generic lint lane", () => {
    const assessment = assessCompletionClaim("PHPCS checks passed", [
      check("Lint", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("phpcs");
    expect(assessment.matchedChecks).toEqual([]);
  });

  it("fails a PHPCS success claim when explicit PHPCS evidence fails", () => {
    const assessment = assessCompletionClaim("PHPCS checks passed", [
      check("phpcs", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment.reason).toContain("phpcs");
  });

  it("does not treat clean as generic CI success language", () => {
    expect(
      assessGenericCiSuccess("CI is clean", [check("CI", "success")])
    ).toBeNull();
  });
});
