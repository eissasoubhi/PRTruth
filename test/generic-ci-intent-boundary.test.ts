import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("generic CI intent boundary", () => {
  it("does not treat an instructional singular check as a whole-PR CI claim", () => {
    const assessment = assessGenericCiSuccess(
      "Any API calls the page makes succeed against a real backend (check the Network tab)",
      [check("pip-audit", "failure"), check("fmt", "failure")]
    );

    expect(assessment).toBeNull();
  });

  it("still treats plural checks as explicit generic CI intent", () => {
    const assessment = assessGenericCiSuccess(
      "All checks pass",
      [check("unit", "success"), check("lint", "failure")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
  });
});
