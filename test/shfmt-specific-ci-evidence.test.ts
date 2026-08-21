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

describe("shfmt-specific CI evidence", () => {
  it("does not let generic green lint prove an explicit shfmt claim", () => {
    const assessment = assessGenericCiSuccess("shfmt -i 2 is clean", [
      check("CI", "success"),
      check("CI / Lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("shfmt");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves shfmt from explicitly named executable workflow evidence", () => {
    const assessment = assessGenericCiSuccess("shfmt -i 2 is clean", [
      check("shell lint", "success"),
      check("shell lint / shfmt (format check)", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "shell lint / shfmt (format check)"
    ]);
  });

  it("fails an shfmt claim when matching shfmt evidence fails", () => {
    const assessment = assessGenericCiSuccess("shfmt -i 2 is clean", [
      check("shell lint", "success"),
      check("shell lint / shfmt (format check)", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("shfmt (format check)");
  });
});
