import { describe, expect, it } from "vitest";

import {
  canonicalVerificationReport,
  hashVerificationReport,
  verifyVerificationReportHash,
} from "../src/receipt-hash.js";
import type { VerificationReport } from "../src/types.js";

const report: VerificationReport = {
  repository: "acme/widgets",
  issueNumber: 7,
  issueTitle: "Ship the widget",
  prNumber: 9,
  prTitle: "feat: ship widget",
  changedFiles: ["src/widget.ts"],
  checks: [
    {
      name: "tests",
      status: "completed",
      conclusion: "success",
      htmlUrl: "https://example.test/check/1",
    },
  ],
  results: [
    {
      requirement: {
        id: "req-1",
        text: "Tests pass",
        source: "issue-checklist",
        checked: true,
      },
      status: "PROVEN",
      reason: "The dedicated test check passed.",
      evidence: [
        {
          kind: "ci",
          summary: "tests passed",
          url: "https://example.test/check/1",
        },
      ],
    },
  ],
  verdict: "PROVEN",
};

describe("hash-addressed verification receipts", () => {
  it("produces a deterministic SHA-256 address", () => {
    const first = hashVerificationReport(report);
    const second = hashVerificationReport(structuredClone(report));

    expect(first).toEqual(second);
    expect(first.algorithm).toBe("sha256");
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.uri).toBe(`sha256:${first.digest}`);
  });

  it("changes the digest when verification evidence changes", () => {
    const changed = structuredClone(report);
    changed.results[0]!.status = "FAILED";
    changed.verdict = "FAILED";

    expect(hashVerificationReport(changed).digest).not.toBe(
      hashVerificationReport(report).digest,
    );
  });

  it("canonicalizes object key order before hashing", () => {
    const reordered = JSON.parse(JSON.stringify(report)) as VerificationReport;

    expect(canonicalVerificationReport(reordered)).toBe(
      canonicalVerificationReport(report),
    );
  });

  it("verifies matching hashes and rejects tampered reports", () => {
    const receipt = hashVerificationReport(report);
    expect(verifyVerificationReportHash(report, receipt)).toBe(true);

    const tampered = structuredClone(report);
    tampered.prTitle = "feat: altered title";
    expect(verifyVerificationReportHash(tampered, receipt)).toBe(false);
  });
});
