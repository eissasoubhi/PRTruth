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

describe("cargo check evidence", () => {
  it("does not turn unrelated CI failures into a failed cargo check claim", () => {
    const assessment = assessGenericCiSuccess(
      "cargo check -p sail-execution --tests — passed",
      [
        check("Rust Build / Build", "success"),
        check("Rust Tests / Test", "failure")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("cargo check");
  });

  it("proves cargo check only from explicitly named executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "cargo check --workspace --all-targets passed",
      [
        check("quality / Run cargo check --workspace --all-targets", "success", "step"),
        check("unrelated tests", "failure")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "quality / Run cargo check --workspace --all-targets"
    ]);
  });

  it("fails a cargo check claim when matching cargo check evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "cargo check --workspace passed",
      [check("quality / Run cargo check --workspace", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("cargo check");
  });

  it("keeps generic CI semantics unchanged", () => {
    const assessment = assessGenericCiSuccess("CI is green", [
      check("Backend", "success"),
      check("Frontend", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
