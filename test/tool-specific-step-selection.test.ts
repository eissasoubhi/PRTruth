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

describe("named tool step selection", () => {
  it("proves Semgrep when the scanner step succeeds and an auxiliary failure guard is skipped", () => {
    const assessment = assessGenericCiSuccess(
      "Semgrep security-audit scans report no findings.",
      [
        check("SAST (Semgrep)", "success"),
        check("Install semgrep", "success", "step"),
        check("Run semgrep", "success", "step"),
        check("Fail job if Semgrep found issues", "skipped", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toContain("Run semgrep");
    expect(assessment?.matchedChecks.map((item) => item.name)).not.toContain("Install semgrep");
  });

  it("does not treat installation as proof when the actual scanner step is skipped", () => {
    const assessment = assessGenericCiSuccess(
      "Semgrep checks passed.",
      [
        check("SAST (Semgrep)", "success"),
        check("Install semgrep", "success", "step"),
        check("Run semgrep", "skipped", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
  });

  it("keeps an explicit scanner failure dominant", () => {
    const assessment = assessGenericCiSuccess(
      "Bandit checks passed.",
      [
        check("SAST (Bandit)", "failure"),
        check("Run bandit", "failure", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
  });
});
