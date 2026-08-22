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

describe("SQLFluff CI evidence", () => {
  it("does not let unrelated green CI prove an explicit SQLFluff claim", () => {
    const assessment = assessGenericCiSuccess(
      "sqlfluff clean on both new migrations",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves SQLFluff only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "sqlfluff clean on both new migrations",
      [check("migrations lint / sqlfluff", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores SQLFluff setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "sqlfluff clean",
      [check("Install sqlfluff", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit SQLFluff evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "sqlfluff clean",
      [check("Run sqlfluff lint", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("sqlfluff");
  });
});
