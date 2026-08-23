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

describe("Vale CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Vale claim", () => {
    const assessment = assessGenericCiSuccess(
      "Vale passes with no alerts on the changed file",
      [check("Lint docs", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Vale only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Vale passes with no alerts on the changed file",
      [check("Lint docs / Lint with Vale", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Vale setup/config-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Vale passes with no alerts on the changed file",
      [check("Prepare Vale CI config", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Vale evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "Vale passes with no alerts on the changed file",
      [check("Lint docs / Lint with Vale", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toMatch(/vale/i);
  });
});
