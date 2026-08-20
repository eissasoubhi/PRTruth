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

describe("Psalm-specific CI evidence", () => {
  it("does not prove Psalm from unrelated all-green CI", () => {
    const assessment = assessGenericCiSuccess("Psalm checks passed", [
      check("PHP 8.3 tests", "success"),
      check("PHP 8.4 tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("psalm");
  });

  it("proves Psalm when named Psalm evidence succeeds", () => {
    const assessment = assessGenericCiSuccess("Psalm checks passed", [
      check("quality / Run Psalm", "success", "step")
    ]);

    expect(assessment?.status).toBe("PROVEN");
  });

  it("fails Psalm when named Psalm evidence fails", () => {
    const assessment = assessGenericCiSuccess("Psalm checks passed", [
      check("quality / Psalm", "failure", "step")
    ]);

    expect(assessment?.status).toBe("FAILED");
  });

  it("requires Psalm and PHPStan independently in a combined claim", () => {
    const assessment = assessGenericCiSuccess("Psalm and PHPStan checks passed", [
      check("quality / PHPStan", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("psalm");
  });
});
