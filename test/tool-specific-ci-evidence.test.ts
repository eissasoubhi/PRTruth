import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("tool-specific generic CI evidence", () => {
  it("does not prove Ruff from unrelated aggregate green CI", () => {
    const assessment = assessGenericCiSuccess("Ruff checks passed", [
      check("Backend", "success"),
      check("Frontend", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("tool-specific validation claim");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("does not prove pytest from unrelated aggregate green CI", () => {
    const assessment = assessGenericCiSuccess("pytest checks passed", [
      check("Build", "success"),
      check("Lint", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("matching tool evidence");
  });

  it("does not prove mypy from unrelated aggregate green CI", () => {
    const assessment = assessGenericCiSuccess("mypy checks passed", [
      check("Unit tests", "success"),
      check("Build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("matching tool evidence");
  });

  it("keeps truly generic CI claims unchanged", () => {
    const assessment = assessGenericCiSuccess("CI is green", [
      check("Backend", "success"),
      check("Frontend", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
