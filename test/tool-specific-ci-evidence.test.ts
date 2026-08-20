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

describe("tool-specific CI evidence", () => {
  it("proves Black and isort only from explicitly named evidence", () => {
    const assessment = assessGenericCiSuccess("Black and isort checks pass", [
      check("Tests (Ubuntu)", "success"),
      check("Format check (black + isort)", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Format check (black + isort)"
    ]);
  });

  it("does not let unrelated green CI prove named formatting tools", () => {
    const assessment = assessGenericCiSuccess("Black and isort checks pass", [
      check("Tests (Ubuntu)", "success"),
      check("Lint (pylint+mypy)", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("black");
    expect(assessment?.reason).toContain("isort");
  });

  it("uses workflow steps as exact tool evidence without assuming a generic job name", () => {
    const assessment = assessGenericCiSuccess("Ruff and Prettier checks passed", [
      check("quality", "success"),
      check("quality / Run ruff check .", "success", "step"),
      check("quality / Run prettier --check .", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "quality / Run ruff check .",
      "quality / Run prettier --check ."
    ]);
  });

  it("keeps pytest and mypy unproven when only generic jobs are visible", () => {
    const pytestAssessment = assessGenericCiSuccess("pytest checks passed", [
      check("Build", "success"),
      check("Tests", "success")
    ]);
    const mypyAssessment = assessGenericCiSuccess("mypy checks passed", [
      check("Build", "success"),
      check("Lint", "success")
    ]);

    expect(pytestAssessment).toMatchObject({ status: "UNPROVEN" });
    expect(pytestAssessment?.reason).toContain("pytest");
    expect(mypyAssessment).toMatchObject({ status: "UNPROVEN" });
    expect(mypyAssessment?.reason).toContain("mypy");
  });

  it("fails a named-tool claim only when matching tool evidence fails", () => {
    const assessment = assessGenericCiSuccess("Black checks pass", [
      check("Tests", "failure"),
      check("format / black", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("format / black");
  });

  it("does not interpret black-box wording as the Black formatter", () => {
    expect(
      assessGenericCiSuccess("Black-box checks passed", [check("CI", "success")])
    ).toMatchObject({ status: "PROVEN" });
  });

  it("keeps truly generic CI claims unchanged", () => {
    const assessment = assessGenericCiSuccess("CI is green", [
      check("Backend", "success"),
      check("Frontend", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
