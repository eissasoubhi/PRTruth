import { describe, expect, it } from "vitest";
import {
  requiresQuantifiedArtifactCountEvidence,
  QUANTIFIED_COUNT_UNPROVEN_REASON
} from "../src/quantitative-guard.js";

describe("strengthened validation evidence guard", () => {
  it("requires direct evidence for an audit that claims an empty exception set", () => {
    expect(
      requiresQuantifiedArtifactCountEvidence(
        "`make security-audit` passes with an empty exception set, named by CI run id."
      )
    ).toBe(true);
  });

  it("requires direct evidence for an unchanged numeric coverage floor", () => {
    expect(
      requiresQuantifiedArtifactCountEvidence(
        "`make test-coverage` green across unit/integration/e2e, coverage floor unchanged (99.65)"
      )
    ).toBe(true);
  });

  it("does not weaken ordinary successful validation claims", () => {
    expect(requiresQuantifiedArtifactCountEvidence("All tests pass")).toBe(false);
    expect(requiresQuantifiedArtifactCountEvidence("Security audit passes")).toBe(false);
    expect(requiresQuantifiedArtifactCountEvidence("Coverage gate is green")).toBe(false);
  });

  it("explains that successful checks alone do not prove the stronger state", () => {
    expect(QUANTIFIED_COUNT_UNPROVEN_REASON).toContain("direct evidence");
    expect(QUANTIFIED_COUNT_UNPROVEN_REASON).toContain("state");
  });
});
