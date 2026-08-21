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

describe("ESLint-specific CI evidence", () => {
  it("does not let generic green lint prove an explicit ESLint claim", () => {
    const assessment = assessGenericCiSuccess("ESLint passed with zero warnings", [
      check("Lint", "success"),
      check("Build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("eslint");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves an explicit ESLint claim from explicitly named executable evidence", () => {
    const assessment = assessGenericCiSuccess("ESLint passed with zero warnings", [
      check("Lint & format-check changed JS files", "success"),
      check("Lint & format-check changed JS files / Run ESLint on changed files", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint & format-check changed JS files / Run ESLint on changed files"
    ]);
  });

  it("requires ESLint and Prettier independently for a composite claim", () => {
    const assessment = assessGenericCiSuccess(
      "eslint and prettier --check are clean on all changed files",
      [check("Lint & format-check changed JS files / Run Prettier check on changed files", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("eslint");
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint & format-check changed JS files / Run Prettier check on changed files"
    ]);
  });

  it("does not return PROVEN when ESLint fails but Prettier succeeds", () => {
    const assessment = assessGenericCiSuccess(
      "eslint and prettier --check are clean on all changed files",
      [
        check("Lint & format-check changed JS files / Run ESLint on changed files", "failure", "step"),
        check("Lint & format-check changed JS files / Run Prettier check on changed files", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("ESLint");
  });
});
