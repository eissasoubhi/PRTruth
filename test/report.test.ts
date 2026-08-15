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
});
