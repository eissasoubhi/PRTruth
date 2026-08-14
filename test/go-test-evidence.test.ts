import { describe, expect, it } from "vitest";

import { assessGoTestEvidence } from "../src/adapters/go-test-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessGoTestEvidence", () => {
  it("proves Go test evidence when recognized checks all succeed", () => {
    const result = assessGoTestEvidence(
      ["go.mod", "internal/math/math_test.go"],
      [check("go test ./...", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(1);
    expect(result.signals).toContain("project:go.mod");
    expect(result.signals).toContain("test-file:internal/math/math_test.go");
  });

  it("fails when a recognized Go test check fails", () => {
    const result = assessGoTestEvidence(
      ["go.sum"],
      [check("go tests", "completed", "failure")],
    );

    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while a recognized Go test check is incomplete", () => {
    const result = assessGoTestEvidence(
      ["go.mod"],
      [check("go test", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when Go signals exist without CI test evidence", () => {
    const result = assessGoTestEvidence(["go.mod", "pkg/api/api_test.go"], []);

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
    expect(result.reason).toContain("no recognizable Go test check");
  });

  it("is not applicable when neither Go project nor test signals exist", () => {
    const result = assessGoTestEvidence(
      ["README.md", "src/index.ts"],
      [check("vitest", "completed", "success")],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
  });

  it("does not treat vet or build checks as Go test evidence", () => {
    const result = assessGoTestEvidence(
      ["go.mod"],
      [check("go vet", "completed", "success"), check("build", "completed", "success")],
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });
});
