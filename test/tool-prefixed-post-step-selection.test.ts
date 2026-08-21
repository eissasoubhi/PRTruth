import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function step(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "step" };
}

describe("prefixed GitHub post-step selection", () => {
  it("ignores a parent-prefixed Post Checkout step after successful Semgrep execution", () => {
    const assessment = assessGenericCiSuccess(
      "Semgrep security-audit scans report no findings.",
      [
        step("SAST (Semgrep) / Run semgrep", "success"),
        step("SAST (Semgrep) / Fail job if Semgrep found issues", "skipped"),
        step("SAST (Semgrep) / Post Checkout repository", null)
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "SAST (Semgrep) / Run semgrep"
    ]);
  });
});
