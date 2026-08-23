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

describe("Brakeman CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Brakeman claim", () => {
    const assessment = assessGenericCiSuccess(
      "Brakeman reports 0 warnings",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Brakeman only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Brakeman reports 0 warnings",
      [check("security / Brakeman", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Brakeman setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Brakeman reports 0 warnings",
      [check("Install Brakeman", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Brakeman evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "Brakeman reports 0 warnings",
      [check("Brakeman", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toMatch(/brakeman/i);
  });
});
