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

describe("generic CI evidence", () => {
  it("fails a full-CI claim when an observed top-level job failed", () => {
    const assessment = assessGenericCiSuccess(
      "Full GitHub-hosted CI must pass, including backend, frontend, Docker Compose, and Chromium/E2E.",
      [
        check("Frontend tests", "success"),
        check("Backend tests", "failure"),
        check("Backend tests / Install dependencies", "failure", "step")
      ]
    );

    expect(assessment).toMatchObject({
      status: "FAILED",
      reason: "Observed top-level CI failure: Backend tests."
    });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Frontend tests",
      "Backend tests"
    ]);
  });

  it("proves a generic CI claim only when every observed top-level check succeeds", () => {
    const assessment = assessGenericCiSuccess("CI is green", [
      check("Backend", "success"),
      check("Frontend", "success"),
      check("Backend / Unit tests", "success", "step")
    ]);

    expect(assessment?.status).toBe("PROVEN");
  });

  it("keeps the claim unproven when a top-level check is skipped", () => {
    const assessment = assessGenericCiSuccess("The workflow completes successfully", [
      check("Backend", "success"),
      check("Browser tests", "skipped")
    ]);

    expect(assessment?.status).toBe("UNPROVEN");
    expect(assessment?.reason).toContain("Browser tests (skipped)");
  });

  it("does not treat mere CI completion as a success claim", () => {
    expect(
      assessGenericCiSuccess("All CI checks completed", [
        check("Backend", "failure"),
        check("Frontend", "success")
      ])
    ).toBeNull();
  });

  it("does not consume specific test claims", () => {
    expect(
      assessGenericCiSuccess("All tests pass", [check("unit tests", "success")])
    ).toBeNull();
  });
});
