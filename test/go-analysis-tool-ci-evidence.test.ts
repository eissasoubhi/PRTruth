import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("Go analysis-tool CI evidence", () => {
  it("does not let generic green CI prove explicit Go analysis-tool claims", () => {
    const assessment = assessGenericCiSuccess(
      "staticcheck, gocritic, errcheck, and deadcode all passed",
      [check("CI", "success"), check("Lint", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("staticcheck");
    expect(assessment?.reason).toContain("gocritic");
    expect(assessment?.reason).toContain("errcheck");
    expect(assessment?.reason).toContain("deadcode");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves the composite claim only when every named tool has executable success evidence", () => {
    const assessment = assessGenericCiSuccess(
      "staticcheck, go-critic, errcheck, and dead code checks passed",
      [
        check("Lint / Staticcheck", "success", "step"),
        check("Lint / Gocritic (anti-pattern detection)", "success", "step"),
        check("Lint / Errcheck (unchecked errors)", "success", "step"),
        check("Lint / Dead code detection", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint / Staticcheck",
      "Lint / Gocritic (anti-pattern detection)",
      "Lint / Errcheck (unchecked errors)",
      "Lint / Dead code detection"
    ]);
  });

  it("keeps the composite claim unproven when one named tool is not observed", () => {
    const assessment = assessGenericCiSuccess(
      "staticcheck, gocritic, errcheck, and deadcode all passed",
      [
        check("Lint / Staticcheck", "success", "step"),
        check("Lint / Gocritic", "success", "step"),
        check("Lint / Errcheck", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("deadcode");
  });

  it("fails the claim when matching tool-specific evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "staticcheck and errcheck passed",
      [
        check("Lint / Staticcheck", "success", "step"),
        check("Lint / Errcheck", "failure", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Errcheck");
  });
});
