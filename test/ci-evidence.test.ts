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

  it("keeps required-check claims unproven when non-required failures may exist", () => {
    const assessment = assessGenericCiSuccess("All required checks are green", [
      check("required / unit", "success"),
      check("advisory / self-hosted GPU", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("required-check membership");
  });

  it("still proves a required-check claim when every observed check is green", () => {
    const assessment = assessGenericCiSuccess("All required checks are green", [
      check("unit", "success"),
      check("integration", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
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

  it("does not infer self-hosted execution from generic green jobs", () => {
    const assessment = assessGenericCiSuccess("CI is green on self-hosted runners", [
      check("Backend", "success"),
      check("Frontend", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("self-hosted");
  });

  it("proves self-hosted CI only when the runner type is visible in the job lane", () => {
    const assessment = assessGenericCiSuccess("CI is green on self-hosted runners", [
      check("Backend / self-hosted", "success"),
      check("Frontend / self-hosted", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("keeps GitHub-hosted and self-hosted runner claims distinct", () => {
    const githubHosted = assessGenericCiSuccess("CI is green on GitHub-hosted runners", [
      check("Backend / GitHub-hosted", "success")
    ]);
    const wrongRunner = assessGenericCiSuccess("CI is green on self-hosted runners", [
      check("Backend / GitHub-hosted", "success")
    ]);

    expect(githubHosted).toMatchObject({ status: "PROVEN" });
    expect(wrongRunner).toMatchObject({ status: "UNPROVEN" });
    expect(wrongRunner?.reason).toContain("self-hosted");
  });

  it("does not infer GPU execution from a generic self-hosted lane", () => {
    const assessment = assessGenericCiSuccess("CI is green on self-hosted GPU runners", [
      check("Backend / self-hosted", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("gpu");
  });

  it("proves a self-hosted GPU claim only when the capability is visible", () => {
    const assessment = assessGenericCiSuccess("CI is green on self-hosted GPU runners", [
      check("build-and-test (gpu) / self-hosted", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("combines runner type with OS matrix claims", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on self-hosted Linux and Windows runners",
      [
        check("Linux / self-hosted", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("windows + self-hosted");
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
    expect(assessment?.reason).toContain("firefox");
    expect(assessment?.reason).toContain("summernote lite");
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
