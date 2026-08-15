import { describe, expect, it } from "vitest";
import { renderMarkdown, renderTerminal } from "../src/report.js";
import type { VerificationReport } from "../src/types.js";

const report: VerificationReport = {
  repository: "acme/widget",
  issueNumber: 12,
  issueTitle: "Run tests",
  prNumber: 14,
  prTitle: "feat: test widget",
  changedFiles: ["src/widget.ts"],
  checks: [],
  claimResults: [
    {
      claim: {
        id: "CLAIM-1",
        text: "All tests pass",
        source: "checked-checklist"
      },
      status: "PROVEN",
      reason: "All observed test checks completed successfully.",
      evidence: [
        {
          kind: "ci",
          summary: "test: success",
          url: "https://example.test/check/1"
        }
      ]
    },
    {
      claim: {
        id: "CLAIM-2",
        text: "No breaking changes",
        source: "claim-section"
      },
      status: "UNPROVEN",
      reason: "A no-breaking-changes claim requires API or schema compatibility evidence, not only CI status.",
      evidence: []
    }
  ],
  results: [
    {
      requirement: {
        id: "REQ-1",
        text: "All tests pass",
        source: "issue-checklist"
      },
      status: "PROVEN",
      reason: "Matching CI checks completed successfully.",
      evidence: [
        {
          kind: "ci",
          summary: "test: success",
          url: "https://example.test/check/1"
        }
      ]
    }
  ],
  verdict: "PROVEN"
};

describe("evidence reports", () => {
  it("includes concrete evidence in Markdown", () => {
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("Concrete evidence");
    expect(markdown).toContain("[test: success](https://example.test/check/1)");
  });

  it("includes concrete evidence in terminal output", () => {
    const terminal = renderTerminal(report);
    expect(terminal).toContain("Evidence");
    expect(terminal).toContain("REQ-1: test: success (https://example.test/check/1)");
  });

  it("flags unsupported completion claims in Markdown with an explanation", () => {
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("### Completion claims");
    expect(markdown).toContain("No breaking changes");
    expect(markdown).toContain("⚠ **UNPROVEN**");
    expect(markdown).toContain("requires API or schema compatibility evidence");
  });

  it("explains claim assessments and evidence in terminal output", () => {
    const terminal = renderTerminal(report);
    expect(terminal).toContain("Completion claims");
    expect(terminal).toContain("Claim explanations");
    expect(terminal).toContain("CLAIM-1: All observed test checks completed successfully.");
    expect(terminal).toContain("↳ test: success (https://example.test/check/1)");
    expect(terminal).toContain("CLAIM-2: A no-breaking-changes claim requires API or schema compatibility evidence, not only CI status.");
  });
});
