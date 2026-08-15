import { describe, expect, it } from "vitest";
import { renderMarkdown, renderTerminal } from "../src/report.js";
import type { VerificationReport } from "../src/types.js";

const report: VerificationReport = {
  repository: "acme/widget",
  issueNumber: 12,
  issueTitle: "Run tests",
  prNumber: 14,
  prTitle: "feat: test widget",
  claimResults: [
    {
      claim: {
        id: "claim-1",
        text: "All tests pass",
        source: "claim-section"
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
    },
    {
      claim: {
        id: "claim-2",
        text: "No breaking changes",
        source: "checked-checklist"
      },
      status: "UNPROVEN",
      reason: "No deterministic compatibility evidence was observed.",
      evidence: []
    }
  ],
  changedFiles: ["src/widget.ts"],
  checks: [],
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

  it("flags unsupported completion claims in Markdown", () => {
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("### Completion claims");
    expect(markdown).toContain("No breaking changes");
    expect(markdown).toContain("⚠ **UNPROVEN** — unsupported");
  });

  it("explains completion claim verdicts with concrete evidence in Markdown", () => {
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("| Claim | Fact check | Why | Concrete evidence |");
    expect(markdown).toContain("Matching CI checks completed successfully.");
    expect(markdown).toContain("No deterministic compatibility evidence was observed.");
    expect(markdown).toContain("[test: success](https://example.test/check/1)");
  });

  it("includes concrete evidence in terminal output", () => {
    const terminal = renderTerminal(report);
    expect(terminal).toContain("Evidence");
    expect(terminal).toContain("REQ-1: test: success (https://example.test/check/1)");
  });

  it("explains completion claim verdicts in terminal output", () => {
    const terminal = renderTerminal(report);
    expect(terminal).toContain("Completion claims");
    expect(terminal).toContain("Claim explanations");
    expect(terminal).toContain("claim-1: Matching CI checks completed successfully.");
    expect(terminal).toContain("Evidence: test: success (https://example.test/check/1)");
    expect(terminal).toContain("claim-2: No deterministic compatibility evidence was observed.");
  });
});
