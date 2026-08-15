import { describe, expect, it } from "vitest";
import { renderVerificationBadge, verificationBadgeUrl } from "../src/badge.js";
import type { VerificationReport } from "../src/types.js";

function report(verdict: VerificationReport["verdict"]): VerificationReport {
  return {
    repository: "eissasoubhi/PRTruth",
    issueNumber: 1,
    issueTitle: "Ship badge output",
    prNumber: 2,
    prTitle: "feat: badge output",
    changedFiles: [],
    checks: [],
    instructions: [],
    results: [],
    verdict
  };
}

describe("verification badges", () => {
  it("renders a green PROVEN badge", () => {
    expect(verificationBadgeUrl("PROVEN")).toContain("PRTruth-PROVEN-brightgreen");
    expect(renderVerificationBadge(report("PROVEN"))).toContain("PRTruth: PROVEN");
  });

  it("renders NOT PROVEN without an unsafe space in the image URL", () => {
    const markdown = renderVerificationBadge(report("NOT_PROVEN"));
    expect(markdown).toContain("PRTruth-NOT%20PROVEN-yellow");
    expect(markdown).toContain("PRTruth: NOT PROVEN");
  });

  it("renders a red FAILED badge", () => {
    expect(verificationBadgeUrl("FAILED")).toContain("PRTruth-FAILED-red");
  });
});
