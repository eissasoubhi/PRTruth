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

describe("Hadolint and actionlint-specific CI evidence", () => {
  it("proves the real composite lint claim only when every named tool is observed", () => {
    const assessment = assessGenericCiSuccess("make lint passed (hadolint, actionlint, shellcheck)", [
      check("lint", "success"),
      check("lint / hadolint all Dockerfiles", "success", "step"),
      check("lint / actionlint all workflows", "success", "step"),
      check("lint / shellcheck all scripts", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "lint / shellcheck all scripts",
      "lint / hadolint all Dockerfiles",
      "lint / actionlint all workflows"
    ]);
  });

  it("does not let ShellCheck or generic lint hide missing Hadolint/actionlint evidence", () => {
    const assessment = assessGenericCiSuccess("make lint passed (hadolint, actionlint, shellcheck)", [
      check("lint", "success"),
      check("lint / shellcheck all scripts", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("hadolint");
    expect(assessment?.reason).toContain("actionlint");
  });

  it("fails the composite claim when an explicitly named tool fails", () => {
    const assessment = assessGenericCiSuccess("make lint passed (hadolint, actionlint, shellcheck)", [
      check("lint / hadolint all Dockerfiles", "success", "step"),
      check("lint / actionlint all workflows", "failure", "step"),
      check("lint / shellcheck all scripts", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("actionlint");
  });
});
