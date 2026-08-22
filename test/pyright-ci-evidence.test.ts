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

describe("Pyright CI evidence", () => {
  it("does not let generic green CI prove an explicit Pyright claim", () => {
    const assessment = assessGenericCiSuccess(
      "Pyright clean",
      [check("CI", "success"), check("Type check", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("pyright");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Pyright from matching executable success evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Pyright clean",
      [
        check("Pyright", "success"),
        check("Pyright / Run Pyright", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Pyright / Run Pyright"
    ]);
  });

  it("does not accept setup-only Pyright evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Pyright passed",
      [check("Install Pyright", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails the claim when matching Pyright evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "Pyright clean",
      [check("Pyright / Run Pyright", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Pyright");
  });
});
