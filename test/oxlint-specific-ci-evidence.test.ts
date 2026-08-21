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

describe("Oxlint-specific CI evidence", () => {
  it("proves an explicit Oxlint claim from named executable evidence", () => {
    const assessment = assessGenericCiSuccess("pnpm check:oxlint is green", [
      check("Lint PR / oxlint", "success"),
      check("Lint PR / oxlint / Oxlint files", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Lint PR / oxlint / Oxlint files"
    ]);
  });

  it("does not let generic green lint prove an explicit Oxlint claim", () => {
    const assessment = assessGenericCiSuccess("Oxlint checks passed", [
      check("Lint", "success"),
      check("Lint / Run lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("oxlint");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails an Oxlint claim when matching Oxlint evidence fails", () => {
    const assessment = assessGenericCiSuccess("Oxlint checks passed", [
      check("Lint PR / oxlint", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Lint PR / oxlint");
  });

  it("keeps unrelated incomplete workflows from contaminating an Oxlint verdict", () => {
    const assessment = assessGenericCiSuccess("pnpm check:oxlint is green", [
      check("oxlint", "success"),
      check("Bundle Stats", null, "check", "in_progress"),
      check("End-to-End Tests", null, "check", "queued")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual(["oxlint"]);
  });
});