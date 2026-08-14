import { describe, expect, it } from "vitest";

import { assessSecurityStaticAnalysisEvidence } from "../src/adapters/security-static-analysis-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessSecurityStaticAnalysisEvidence", () => {
  it("proves security/static-analysis evidence when recognized checks succeed", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [".semgrep.yml", "phpstan.neon"],
      [
        check("CodeQL", "completed", "success"),
        check("phpstan", "completed", "success"),
      ],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(2);
    expect(result.signals).toContain("security-config:.semgrep.yml");
    expect(result.signals).toContain("security-config:phpstan.neon");
  });

  it("fails when a recognized security check fails", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [],
      [check("Semgrep security scan", "completed", "failure")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while a recognized check is incomplete", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [],
      [check("Snyk", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when configuration changes without matching CI", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [".github/codeql/codeql-config.yml"],
      [check("tests", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });

  it("recognizes common security and static-analysis tools", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [],
      [
        check("Trivy scan", "completed", "success"),
        check("Bandit", "completed", "success"),
        check("gosec", "completed", "success"),
        check("composer audit", "completed", "success"),
      ],
    );

    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(4);
  });

  it("does not treat generic lint, tests, or builds as security evidence", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      ["src/index.ts"],
      [
        check("lint", "completed", "success"),
        check("tests", "completed", "success"),
        check("build", "completed", "success"),
      ],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });

  it("keeps cancelled recognized checks from being treated as proven", () => {
    const result = assessSecurityStaticAnalysisEvidence(
      [],
      [check("dependency review", "completed", "cancelled")],
    );

    expect(result.status).toBe("FAILED");
  });
});
