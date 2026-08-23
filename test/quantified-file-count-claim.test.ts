import { describe, expect, it } from "vitest";
import { requiresQuantifiedArtifactCountEvidence } from "../src/quantitative-guard.js";

describe("quantified artifact-count completion claims", () => {
  it("requires value evidence for the real publish-probe shape", () => {
    expect(
      requiresQuantifiedArtifactCountEvidence(
        "Probe publish at a non-SNAPSHOT version writes 165 files into build/staging: 150 artifacts plus 15 metadata files"
      )
    ).toBe(true);
  });

  it("covers artifact and archive entry counts", () => {
    expect(requiresQuantifiedArtifactCountEvidence("150 artifacts were produced")).toBe(true);
    expect(requiresQuantifiedArtifactCountEvidence("The archive contains 150 entries")).toBe(true);
  });

  it("does not treat an ordinary build-success claim as quantified", () => {
    expect(requiresQuantifiedArtifactCountEvidence("The build passes")).toBe(false);
  });
});
