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

  it("proves scoped generic CI claims only when every claimed matrix lane is visible", () => {
    const assessment = assessGenericCiSuccess("CI is green on Node 22 and Node 24", [
      check("Node 22", "success"),
      check("Node 24", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.reason).toContain("every claimed environment scope");
  });

  it("keeps scoped generic CI claims unproven when a claimed lane is missing", () => {
    const nodeAssessment = assessGenericCiSuccess("CI is green on Node 22 and Node 24", [
      check("Node 22", "success")
    ]);
    const browserAssessment = assessGenericCiSuccess("Workflow passes on Chromium and Firefox", [
      check("browser / Chromium", "success")
    ]);

    expect(nodeAssessment).toMatchObject({ status: "UNPROVEN" });
    expect(nodeAssessment?.reason).toContain("node 24");
    expect(browserAssessment).toMatchObject({ status: "UNPROVEN" });
    expect(browserAssessment?.reason).toContain("firefox");
  });

  it("requires Cartesian coverage for generic multi-axis CI claims", () => {
    const assessment = assessGenericCiSuccess("CI is green on Linux and Windows with Node 22 and Node 24", [
      check("Linux / Node 22", "success"),
      check("Linux / Node 24", "success"),
      check("Windows / Node 22", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("windows + node 24");
  });

  it("does not ignore Summernote host variants when browser lanes are green", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Summernote BS3 + BS4 + BS5 + Lite across Chromium and Firefox",
      [
        check("BS3 / Chromium", "success"),
        check("BS3 / Firefox", "success"),
        check("BS4 / Chromium", "success"),
        check("BS4 / Firefox", "success"),
        check("BS5 / Chromium", "success"),
        check("BS5 / Firefox", "success"),
        check("Lite / Chromium", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("summernote lite + firefox");
  });

  it("proves the full Summernote host and browser matrix when every lane is visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Summernote Bootstrap 3, Bootstrap 4, Bootstrap 5 and Lite across Chromium and Firefox",
      [
        check("Bootstrap 3 / Chromium", "success"),
        check("Bootstrap 3 / Firefox", "success"),
        check("Bootstrap 4 / Chromium", "success"),
        check("Bootstrap 4 / Firefox", "success"),
        check("Bootstrap 5 / Chromium", "success"),
        check("Bootstrap 5 / Firefox", "success"),
        check("Summernote Lite / Chromium", "success"),
        check("Summernote Lite / Firefox", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
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
