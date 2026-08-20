import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
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

describe("PHPStan evidence identity", () => {
  it("does not prove a PHPStan completion claim from generic static analysis", () => {
    const assessment = assessCompletionClaim("focused application PHPStan: passed", [
      check("CI - PHP-8.4 - Laravel-13.* / Run static analysis", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN", matchedChecks: [] });
    expect(assessment.reason).toContain("lint");
  });

  it("proves and fails PHPStan claims only from explicitly named PHPStan evidence", () => {
    expect(
      assessCompletionClaim("PHPStan passed", [check("PHPStan", "success", "step")]).status
    ).toBe("PROVEN");
    expect(
      assessCompletionClaim("PHPStan passed", [check("PHPStan", "failure", "step")]).status
    ).toBe("FAILED");
  });

  it("keeps generic static-analysis claims backward compatible", () => {
    expect(
      assessCompletionClaim("Static analysis passes", [check("Run static analysis", "success", "step")]).status
    ).toBe("PROVEN");
  });

  it("does not let aggregate green CI prove PHPStan checks", () => {
    const assessment = assessGenericCiSuccess("PHPStan checks passed", [
      check("Application Quality", "success"),
      check("Application Quality / Run static analysis", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN", matchedChecks: [] });
    expect(assessment?.reason).toContain("phpstan");
  });
});
