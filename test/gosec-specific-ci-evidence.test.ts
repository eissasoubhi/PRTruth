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

describe("Gosec CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Gosec claim", () => {
    const assessment = assessGenericCiSuccess(
      "gosec v2.28.0 reports 0 issues",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Gosec only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "gosec v2.28.0 reports 0 issues",
      [check("Security Scan / Run Gosec Security Scanner", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Gosec setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "gosec v2.28.0 reports 0 issues",
      [check("Install gosec", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Gosec evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "gosec v2.28.0 reports 0 issues",
      [check("Run Gosec Security Scanner", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("gosec");
  });
});
