import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function step(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "step" };
}

describe("pre-commit tool-specific evidence", () => {
  it("does not let a generic green pre-commit job prove named tools hidden in its logs", () => {
    const assessment = assessGenericCiSuccess(
      "codespell, pylint, pyink, mdformat, yamllint and actionlint all passed on diff files",
      [step("Code Quality Check / Run code quality checks", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("codespell");
    expect(assessment?.reason).toContain("yamllint");
  });

  it("proves the named pre-commit tools when every tool is explicitly observable", () => {
    const assessment = assessGenericCiSuccess(
      "codespell, pylint, pyink, mdformat and yamllint passed",
      [
        step("Run codespell", "success"),
        step("Run pylint", "success"),
        step("Run pyink", "success"),
        step("Run mdformat", "success"),
        step("Run yamllint", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("keeps a skipped named tool unproven even when the surrounding job is green", () => {
    const assessment = assessGenericCiSuccess(
      "codespell and yamllint passed",
      [
        step("Run codespell", "success"),
        step("Run yamllint", "skipped")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("yamllint");
  });

  it("fails the composite claim when an explicitly named tool fails", () => {
    const assessment = assessGenericCiSuccess(
      "codespell and pylint passed",
      [
        step("Run codespell", "success"),
        step("Run pylint", "failure")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("pylint");
  });
});
