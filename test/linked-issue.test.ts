import { describe, expect, it } from "vitest";
import { extractClosingIssueNumbers, resolveIssueNumber } from "../src/linked-issue.js";

describe("linked issue inference", () => {
  it("extracts common GitHub closing keywords", () => {
    expect(extractClosingIssueNumbers("Fixes #12\nCloses #34\nresolved #56")).toEqual([12, 34, 56]);
  });

  it("deduplicates repeated references", () => {
    expect(extractClosingIssueNumbers("Fixes #12. Also closes #12.")).toEqual([12]);
  });

  it("prefers an explicit issue number", () => {
    expect(resolveIssueNumber(99, "Fixes #12")).toBe(99);
  });

  it("infers a single closing issue", () => {
    expect(resolveIssueNumber(undefined, "## Summary\nDone.\n\nFixes #42")).toBe(42);
  });

  it("requires an explicit issue when no closing reference exists", () => {
    expect(() => resolveIssueNumber(undefined, "No linked issue here.")).toThrow(
      "Pass --issue <number>"
    );
  });

  it("requires an explicit issue when several issues are closed", () => {
    expect(() => resolveIssueNumber(undefined, "Fixes #12\nFixes #34")).toThrow(
      "closes multiple issues (#12, #34)"
    );
  });
});
