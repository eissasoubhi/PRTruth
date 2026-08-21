import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, scope, status };
}

describe("git diff --check evidence", () => {
  it("does not let unrelated failing CI fail a git diff --check claim", () => {
    const assessment = assessGenericCiSuccess("git diff --check passes", [
      check("unit tests", "failure"),
      check("build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("git diff --check");
  });

  it("does not let unrelated green CI prove a git diff --check claim", () => {
    const assessment = assessGenericCiSuccess("git diff --check passed", [
      check("unit tests", "success"),
      check("build", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
  });

  it("proves the claim from explicit executable git diff --check evidence", () => {
    const assessment = assessGenericCiSuccess("git diff --check passed", [
      check("quality / Run git diff --check", "success", "step"),
      check("unit tests", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "quality / Run git diff --check"
    ]);
  });

  it("fails the claim from explicit failed git diff --check evidence", () => {
    const assessment = assessGenericCiSuccess("git diff --check passed", [
      check("quality / Run git diff --check", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
  });
});
