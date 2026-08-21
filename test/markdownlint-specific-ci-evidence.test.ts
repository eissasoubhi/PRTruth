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

describe("Markdownlint-specific CI evidence", () => {
  it("does not let aggregate green lint prove an explicit Markdownlint claim", () => {
    const assessment = assessGenericCiSuccess("markdownlint-cli2 is clean", [
      check("Lint", "success"),
      check("Build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("markdownlint");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves a Markdownlint claim from explicitly named executable evidence", () => {
    const assessment = assessGenericCiSuccess("markdownlint-cli2 is clean", [
      check("lint", "success"),
      check("lint / Run markdownlint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "lint / Run markdownlint"
    ]);
  });

  it("accepts markdownlint-cli and markdownlint-cli2 spellings", () => {
    const cli = assessGenericCiSuccess("markdownlint-cli passed", [
      check("markdownlint", "success")
    ]);
    const cli2 = assessGenericCiSuccess("markdownlint-cli2 passed", [
      check("markdownlint", "success")
    ]);

    expect(cli).toMatchObject({ status: "PROVEN" });
    expect(cli2).toMatchObject({ status: "PROVEN" });
  });

  it("fails a Markdownlint claim when matching Markdownlint evidence fails", () => {
    const assessment = assessGenericCiSuccess("markdownlint-cli2 is clean", [
      check("lint", "success"),
      check("lint / Run markdownlint-cli2", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("markdownlint-cli2");
  });
});
