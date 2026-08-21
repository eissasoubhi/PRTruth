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

describe("rustfmt-specific CI evidence", () => {
  it("does not let generic green CI prove rustfmt", () => {
    const assessment = assessGenericCiSuccess("rustfmt checks passed", [
      check("CI", "success"),
      check("CI / Lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rustfmt");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves rustfmt from an explicit cargo fmt step", () => {
    const assessment = assessGenericCiSuccess("rustfmt checks passed", [
      check("policy", "success"),
      check("policy / Run cargo fmt --all -- --check", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "policy / Run cargo fmt --all -- --check"
    ]);
  });

  it("fails rustfmt when the explicit cargo fmt step fails", () => {
    const assessment = assessGenericCiSuccess("rustfmt checks passed", [
      check("policy / Run cargo fmt --all -- --check", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
  });

  it("requires both actionlint and rustfmt for the real composite validation shape", () => {
    const claim = "actionlint and rustfmt checks passed";

    const incomplete = assessGenericCiSuccess(claim, [
      check("policy / Run actionlint", "success", "step")
    ]);
    expect(incomplete).toMatchObject({ status: "UNPROVEN" });
    expect(incomplete?.reason).toContain("rustfmt");

    const complete = assessGenericCiSuccess(claim, [
      check("policy / Run actionlint", "success", "step"),
      check("policy / Run cargo fmt --all -- --check", "success", "step")
    ]);
    expect(complete).toMatchObject({ status: "PROVEN" });
  });
});
