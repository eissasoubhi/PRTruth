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

describe("security scanner clean-result evidence", () => {
  it("proves the OpenShield Bandit claim from the explicit successful Bandit job", () => {
    const assessment = assessGenericCiSuccess(
      "Bandit reports no medium or high findings.",
      [
        check("SAST (Bandit)", "success"),
        check("Lint (ruff)", "success"),
        check("Backend Tests (pytest + coverage)", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual(["SAST (Bandit)"]);
  });

  it("proves the OpenShield pip-audit claim only from pip-audit evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Pip Audit reports no known vulnerabilities.",
      [
        check("SCA (pip-audit)", "success"),
        check("SAST (Semgrep)", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual(["SCA (pip-audit)"]);
  });

  it("accepts explicit no-findings/no-secrets language for already named scanners", () => {
    const semgrep = assessGenericCiSuccess(
      "Semgrep security scans report no findings.",
      [check("SAST (Semgrep)", "success")]
    );
    const gitleaks = assessGenericCiSuccess(
      "Gitleaks reports no secrets in the staged change.",
      [check("Secret Scan (Gitleaks)", "success")]
    );

    expect(semgrep?.status).toBe("PROVEN");
    expect(gitleaks?.status).toBe("PROVEN");
  });

  it("does not let unrelated green security CI prove Bandit", () => {
    const assessment = assessGenericCiSuccess(
      "Bandit reports no medium or high findings.",
      [
        check("SAST (Semgrep)", "success"),
        check("Security Scan", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("bandit");
  });

  it("fails when the named security scanner fails", () => {
    const assessment = assessGenericCiSuccess(
      "Pip Audit reports no known vulnerabilities.",
      [check("SCA (pip-audit)", "failure")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
  });
});
