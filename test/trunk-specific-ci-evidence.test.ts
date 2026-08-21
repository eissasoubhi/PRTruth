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

describe("Trunk-specific CI evidence", () => {
  it("does not let unrelated green CI prove trunk check", () => {
    const assessment = assessGenericCiSuccess("trunk check passed", [
      check("Static analysis", "success"),
      check("Unit tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("trunk");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves trunk check from explicitly named Trunk workflow evidence", () => {
    const assessment = assessGenericCiSuccess("trunk check passed", [
      check("Static analysis", "success"),
      check("Static analysis / Trunk Code Quality", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Static analysis / Trunk Code Quality"
    ]);
  });

  it("fails trunk check when matching Trunk evidence fails", () => {
    const assessment = assessGenericCiSuccess("trunk check passed", [
      check("Static analysis / Trunk Code Quality", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Trunk Code Quality");
  });

  it("does not mistake a branch named trunk for the Trunk validation tool", () => {
    const assessment = assessGenericCiSuccess("CI checks passed on trunk", [
      check("CI", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
