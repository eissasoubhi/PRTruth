import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status, scope: "check" };
}

describe("Ruby lint tool evidence", () => {
  it("proves RuboCop and StandardRB only when both named lanes are present and green", () => {
    const assessment = assessGenericCiSuccess("RuboCop and StandardRB checks: passed", [
      check("Rubocop", "success"),
      check("Standard", "success"),
      check("RSpec", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual(["Rubocop", "Standard"]);
  });

  it("keeps the composite claim unproven when StandardRB evidence is missing", () => {
    const assessment = assessGenericCiSuccess("RuboCop and StandardRB checks: passed", [
      check("Rubocop", "success"),
      check("RSpec", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("standardrb");
  });

  it("fails the composite claim when matching StandardRB evidence fails", () => {
    const assessment = assessGenericCiSuccess("RuboCop and StandardRB checks: passed", [
      check("Rubocop", "success"),
      check("Standard", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Standard");
  });

  it("does not let unrelated green CI prove a RuboCop-specific statement", () => {
    const assessment = assessGenericCiSuccess("RuboCop checks passed", [
      check("RSpec", "success"),
      check("Build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rubocop");
  });
});
