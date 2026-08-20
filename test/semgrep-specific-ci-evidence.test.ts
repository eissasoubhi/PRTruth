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

describe("Semgrep-specific CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Semgrep claim", () => {
    const assessment = assessGenericCiSuccess("Semgrep checks passed", [
      check("CI", "success"),
      check("CI / Ruff", "success", "step"),
      check("CI / pytest", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("semgrep");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves a Semgrep claim from explicitly named workflow evidence", () => {
    const assessment = assessGenericCiSuccess("Semgrep checks passed", [
      check("CI", "success"),
      check("Semgrep security scan", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Semgrep security scan"
    ]);
  });

  it("fails a Semgrep claim when matching Semgrep evidence fails", () => {
    const assessment = assessGenericCiSuccess("Semgrep checks passed", [
      check("CI", "success"),
      check("Semgrep security scan", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Semgrep security scan");
  });
});
