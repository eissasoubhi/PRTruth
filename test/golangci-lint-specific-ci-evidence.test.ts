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

describe("golangci-lint-specific CI evidence", () => {
  it("proves a golangci-lint claim from explicitly named successful evidence", () => {
    const assessment = assessGenericCiSuccess("golangci-lint passed", [
      check("lint", "success"),
      check("lint / golangci-lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "lint / golangci-lint"
    ]);
  });

  it("does not let generic green lint prove a golangci-lint claim", () => {
    const assessment = assessGenericCiSuccess("golangci-lint passed", [
      check("Lint", "success"),
      check("Tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("golangci-lint");
  });

  it("fails a golangci-lint claim when explicit golangci-lint evidence fails", () => {
    const assessment = assessGenericCiSuccess("golangci-lint passed", [
      check("golangci-lint", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("golangci-lint");
  });
});
