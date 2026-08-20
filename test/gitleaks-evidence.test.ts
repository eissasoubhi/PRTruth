import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("Gitleaks evidence", () => {
  it("proves an explicit Gitleaks claim from matching successful evidence", () => {
    const assessment = assessGenericCiSuccess("Gitleaks passed", [
      check("gitleaks", "success"),
      check("unit tests", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual(["gitleaks"]);
  });

  it("does not let unrelated green CI prove Gitleaks", () => {
    const assessment = assessGenericCiSuccess("Gitleaks passed", [
      check("lint", "success"),
      check("tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("gitleaks");
  });

  it("fails an explicit Gitleaks claim when matching evidence fails", () => {
    const assessment = assessGenericCiSuccess("Gitleaks passed", [
      check("Gitleaks (licensed action)", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Gitleaks");
  });
});
