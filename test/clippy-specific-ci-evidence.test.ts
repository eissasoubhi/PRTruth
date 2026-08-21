import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("Clippy-specific CI evidence", () => {
  it("does not let generic lint prove an explicit Clippy success claim", () => {
    const assessment = assessGenericCiSuccess("Clippy checks passed", [
      check("CI", "success"),
      check("CI / Lint", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("clippy");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves an explicit Clippy success claim from cargo clippy evidence", () => {
    const assessment = assessGenericCiSuccess("Clippy checks passed", [
      check("test", "success"),
      check("test / Run cargo clippy --all-targets -- -D warnings", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "test / Run cargo clippy --all-targets -- -D warnings"
    ]);
  });

  it("fails an explicit Clippy claim when cargo clippy fails", () => {
    const assessment = assessGenericCiSuccess("Clippy checks passed", [
      check("test / Run cargo clippy --all-targets -- -D warnings", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
  });

  it("proves a structured Python-binding Clippy claim from the real workflow shape", () => {
    const assessment = assessCompletionClaim("Python-binding Clippy", [
      check("test", "success"),
      check(
        "test / Run PYO3_PYTHON=\"$GITHUB_WORKSPACE/.venv/bin/python\" cargo clippy --all-targets --features python-bindings -- -D warnings",
        "success",
        "step"
      ),
      check("test / Run cargo test --all-targets --features python-bindings", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "test / Run PYO3_PYTHON=\"$GITHUB_WORKSPACE/.venv/bin/python\" cargo clippy --all-targets --features python-bindings -- -D warnings"
    ]);
  });

  it("keeps a structured Clippy claim unproven when only tests are visible", () => {
    const assessment = assessCompletionClaim("Python-binding Clippy", [
      check("test", "success"),
      check("test / Run cargo test --all-targets --features python-bindings", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.matchedChecks).toEqual([]);
  });
});
