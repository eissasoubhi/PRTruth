import { describe, expect, it } from "vitest";

import { assessJsTestEvidence } from "../src/adapters/js-test-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessJsTestEvidence", () => {
  it("proves test evidence when recognized checks all succeed", () => {
    const result = assessJsTestEvidence(
      ["package.json", "src/math.test.ts"],
      [check("unit tests / vitest", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(1);
    expect(result.signals).toContain("project:package.json");
    expect(result.signals).toContain("test-file:src/math.test.ts");
  });

  it("fails when a recognized test check fails", () => {
    const result = assessJsTestEvidence(
      ["pnpm-lock.yaml"],
      [check("tests", "completed", "failure")],
    );

    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while a recognized test check is incomplete", () => {
    const result = assessJsTestEvidence(
      ["package.json"],
      [check("jest", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when project signals exist without CI test evidence", () => {
    const result = assessJsTestEvidence(["package.json", "src/widget.spec.tsx"], []);

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("no recognizable test check");
  });

  it("is not applicable when neither project nor test signals exist", () => {
    const result = assessJsTestEvidence(
      ["README.md", "src/server.php"],
      [check("phpunit", "completed", "success")],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
  });

  it("does not treat generic build checks as test evidence", () => {
    const result = assessJsTestEvidence(
      ["package.json"],
      [check("build", "completed", "success")],
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });
});
