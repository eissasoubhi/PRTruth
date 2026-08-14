import { describe, expect, it } from "vitest";

import { assessPytestEvidence } from "../src/adapters/pytest-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessPytestEvidence", () => {
  it("proves pytest evidence when recognized checks all succeed", () => {
    const result = assessPytestEvidence(
      ["pyproject.toml", "tests/test_math.py"],
      [check("pytest / python 3.12", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(1);
    expect(result.signals).toContain("project:pyproject.toml");
    expect(result.signals).toContain("test-file:tests/test_math.py");
  });

  it("fails when a recognized pytest check fails", () => {
    const result = assessPytestEvidence(
      ["requirements.txt"],
      [check("pytest", "completed", "failure")],
    );

    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while a recognized pytest check is incomplete", () => {
    const result = assessPytestEvidence(
      ["pytest.ini"],
      [check("python tests", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when Python signals exist without CI pytest evidence", () => {
    const result = assessPytestEvidence(["pyproject.toml", "test_api.py"], []);

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("no recognizable pytest check");
  });

  it("is not applicable when neither Python nor pytest signals exist", () => {
    const result = assessPytestEvidence(
      ["package.json", "src/math.test.ts"],
      [check("vitest", "completed", "success")],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
  });

  it("does not treat generic build checks as pytest evidence", () => {
    const result = assessPytestEvidence(
      ["pyproject.toml"],
      [check("build", "completed", "success")],
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });
});
