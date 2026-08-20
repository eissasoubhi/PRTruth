import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function step(name: string, conclusion: string | null): CheckRunSummary {
  return {
    name,
    conclusion,
    status: "completed",
    scope: "step"
  };
}

describe("Flake8 validation evidence", () => {
  it("proves a direct Flake8 success claim from an explicit successful Flake8 step", () => {
    const assessment = assessGenericCiSuccess(
      "cd backend && flake8 app/ tests/ — passed",
      [step("Run flake8", "success")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((check) => check.name)).toEqual(["Run flake8"]);
  });

  it("keeps a direct Flake8 success claim unproven when only generic lint evidence exists", () => {
    const assessment = assessGenericCiSuccess(
      "flake8 app/ tests/ passed",
      [step("Run lint", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("flake8");
  });

  it("fails a direct Flake8 success claim when the explicit Flake8 evidence failed", () => {
    const assessment = assessGenericCiSuccess(
      "flake8 app/ tests/ passed",
      [step("Run flake8", "failure")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
  });

  it("requires every named tool in a combined validation claim", () => {
    const assessment = assessGenericCiSuccess(
      "Black and changed-code Flake8 checks pass",
      [step("Run black", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("flake8");
  });
});
