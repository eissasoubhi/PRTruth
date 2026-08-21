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

describe("ShellCheck-specific CI evidence", () => {
  it("proves a ShellCheck claim from explicitly named successful evidence", () => {
    const assessment = assessGenericCiSuccess("ShellCheck passed", [
      check("shellcheck", "success"),
      check("shellcheck / Run shellcheck bootstrap/install.sh checks/*.sh", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "shellcheck"
    ]);
  });

  it("does not let generic green lint prove a ShellCheck claim", () => {
    const assessment = assessGenericCiSuccess("ShellCheck passed", [
      check("Lint", "success"),
      check("Tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("shellcheck");
  });

  it("fails a ShellCheck claim when explicit ShellCheck evidence fails", () => {
    const assessment = assessGenericCiSuccess("ShellCheck passed", [
      check("shellcheck", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("shellcheck");
  });
});
