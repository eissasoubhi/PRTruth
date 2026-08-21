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

describe("Stylelint-specific CI evidence", () => {
  it("proves a Stylelint claim from explicitly named executable evidence", () => {
    const assessment = assessGenericCiSuccess("Stylelint is clean", [
      check("Lint and validate / lint", "success"),
      check("Lint and validate / lint / Run Stylelint", "success", "step"),
      check("Visual Testing", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint and validate / lint / Run Stylelint"
    ]);
  });

  it("does not let generic green lint prove an explicit Stylelint claim", () => {
    const assessment = assessGenericCiSuccess("Stylelint checks passed", [
      check("Lint", "success"),
      check("Lint / Run lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("stylelint");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails a Stylelint claim when matching Stylelint evidence fails", () => {
    const assessment = assessGenericCiSuccess("Stylelint checks passed", [
      check("Lint and validate / lint / Run Stylelint", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Run Stylelint");
  });

  it("keeps unrelated failing workflows from contaminating a Stylelint verdict", () => {
    const assessment = assessGenericCiSuccess("Stylelint checks passed", [
      check("Lint and validate / lint / Run Stylelint", "success", "step"),
      check("Visual Testing", "failure"),
      check("Playwright Tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint and validate / lint / Run Stylelint"
    ]);
  });
});
