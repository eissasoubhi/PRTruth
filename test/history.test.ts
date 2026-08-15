import { describe, expect, it } from "vitest";
import { compareVerificationReports } from "../src/history.js";
import type { EvidenceStatus, VerificationReport } from "../src/types.js";

function report(
  verdict: VerificationReport["verdict"],
  results: Array<[id: string, status: EvidenceStatus, text?: string]>
): VerificationReport {
  return {
    repository: "acme/app",
    issueNumber: 1,
    issueTitle: "Ship feature",
    prNumber: 2,
    prTitle: "Implement feature",
    changedFiles: [],
    checks: [],
    verdict,
    results: results.map(([id, status, text]) => ({
      requirement: {
        id,
        text: text ?? id,
        source: "issue-checklist"
      },
      status,
      reason: "fixture",
      evidence: []
    }))
  };
}

describe("compareVerificationReports", () => {
  it("classifies improvements and regressions by evidence strength", () => {
    const comparison = compareVerificationReports(
      report("NOT_PROVEN", [["tests", "UNPROVEN"], ["build", "PROVEN"]]),
      report("NOT_PROVEN", [["tests", "PROVEN"], ["build", "FAILED"]])
    );

    expect(comparison.requirements).toEqual([
      expect.objectContaining({ requirementId: "build", trend: "REGRESSED" }),
      expect.objectContaining({ requirementId: "tests", trend: "IMPROVED" })
    ]);
    expect(comparison.improvements).toBe(1);
    expect(comparison.regressions).toBe(1);
  });

  it("tracks added and removed requirements separately from regressions", () => {
    const comparison = compareVerificationReports(
      report("PROVEN", [["existing", "PROVEN"], ["removed", "PROVEN"]]),
      report("NOT_PROVEN", [["existing", "PROVEN"], ["added", "UNPROVEN"]])
    );

    expect(comparison.requirements).toEqual([
      expect.objectContaining({ requirementId: "added", before: null, after: "UNPROVEN", trend: "ADDED" }),
      expect.objectContaining({ requirementId: "existing", trend: "UNCHANGED" }),
      expect.objectContaining({ requirementId: "removed", before: "PROVEN", after: null, trend: "REMOVED" })
    ]);
    expect(comparison.added).toBe(1);
    expect(comparison.removed).toBe(1);
    expect(comparison.regressions).toBe(0);
  });

  it("preserves before and after verdicts for higher-level history reporting", () => {
    const comparison = compareVerificationReports(
      report("FAILED", [["tests", "FAILED"]]),
      report("PROVEN", [["tests", "PROVEN"]])
    );

    expect(comparison.beforeVerdict).toBe("FAILED");
    expect(comparison.afterVerdict).toBe("PROVEN");
  });
});
