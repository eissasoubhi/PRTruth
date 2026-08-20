import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("Prettier-specific generic CI evidence", () => {
  it("does not prove Prettier from unrelated all-green CI", () => {
    const assessment = assessGenericCiSuccess(
      "Prettier and git diff checks: passed",
      [
        check("Test Build", "success"),
        check("Run Tests", "success")
      ]
    );

    expect(assessment).toMatchObject({
      status: "UNPROVEN",
      matchedChecks: []
    });
    expect(assessment?.reason).toContain("tool-specific validation claim");
  });

  it("keeps truly generic green-CI statements provable", () => {
    const assessment = assessGenericCiSuccess(
      "All CI checks passed",
      [
        check("Test Build", "success"),
        check("Run Tests", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
