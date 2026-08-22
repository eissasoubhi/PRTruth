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

describe("Pyrefly CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Pyrefly claim", () => {
    const assessment = assessGenericCiSuccess(
      "pyrefly check reports 0 errors",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Pyrefly only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "pyrefly check reports 0 errors",
      [check("Types / pyrefly check", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Pyrefly setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "pyrefly check reports 0 errors",
      [check("Install pyrefly", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Pyrefly evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "pyrefly check reports 0 errors",
      [check("pyrefly check", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("pyrefly");
  });
});
