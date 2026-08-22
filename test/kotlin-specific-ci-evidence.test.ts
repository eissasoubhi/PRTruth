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

describe("Kotlin validation-tool CI evidence", () => {
  it("does not let generic green CI prove explicit ktlint and detekt claims", () => {
    const assessment = assessGenericCiSuccess("ktlint and detekt checks passed", [
      check("CI", "success"),
      check("Build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("ktlint");
    expect(assessment?.reason).toContain("detekt");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves the composite claim only when both tools have executable success evidence", () => {
    const assessment = assessGenericCiSuccess("ktlint and detekt checks passed", [
      check("Android CI", "success"),
      check("Static Analysis (ktlint & detekt) / Run ktlint", "success", "step"),
      check("Static Analysis (ktlint & detekt) / Run detekt", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Static Analysis (ktlint & detekt) / Run ktlint",
      "Static Analysis (ktlint & detekt) / Run detekt"
    ]);
  });

  it("keeps a composite claim unproven when only ktlint is observed", () => {
    const assessment = assessGenericCiSuccess("ktlint and detekt checks passed", [
      check("Android CI", "success"),
      check("Android CI / ./gradlew ktlintCheck", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("detekt");
  });

  it("fails the claim when matching detekt evidence fails", () => {
    const assessment = assessGenericCiSuccess("ktlint and detekt checks passed", [
      check("Static Analysis / ktlintCheck", "success", "step"),
      check("Static Analysis / detekt", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("detekt");
  });
});
