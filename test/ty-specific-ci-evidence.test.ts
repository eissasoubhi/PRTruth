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

describe("ty CI evidence", () => {
  it("does not let unrelated green CI prove an explicit ty claim", () => {
    const assessment = assessGenericCiSuccess(
      "ty check passed",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves ty only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "ty check passed",
      [check("Typecheck (ty)", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores ty setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "ty check passed",
      [check("Install ty", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit ty evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "ty check passed",
      [check("Typecheck (ty)", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("ty");
  });
});
