import { describe, expect, it } from "vitest";
import {
  hasPackagedRuntimeExecutionEvidence,
  requiresPackagedRuntimeExecutionEvidence
} from "../src/packaged-runtime-evidence.js";

describe("packaged runtime evidence", () => {
  it("requires direct evidence for NSIS and win-unpacked runtime claims", () => {
    const claim = "Both `win-unpacked` and the NSIS-installed v0.8.1 build pass the original scenario.";

    expect(requiresPackagedRuntimeExecutionEvidence(claim)).toBe(true);
    expect(hasPackagedRuntimeExecutionEvidence(claim, [
      { kind: "ci", summary: "test (windows) / Install dependencies: success" },
      { kind: "ci", summary: "build (next.js): success" }
    ])).toBe(false);
  });

  it("accepts evidence only when every named packaged artifact was directly exercised", () => {
    const claim = "Both `win-unpacked` and the NSIS-installed v0.8.1 build pass the original scenario.";

    expect(hasPackagedRuntimeExecutionEvidence(claim, [
      { kind: "ci", summary: "Windows / win-unpacked runtime smoke test: success" },
      { kind: "ci", summary: "Windows / NSIS install and launch smoke test: success" }
    ])).toBe(true);
  });

  it("does not treat ordinary dependency installation as installed-package runtime proof", () => {
    const claim = "The installed application launches successfully.";

    expect(requiresPackagedRuntimeExecutionEvidence(claim)).toBe(true);
    expect(hasPackagedRuntimeExecutionEvidence(claim, [
      { kind: "ci", summary: "Install dependencies: success" }
    ])).toBe(false);
  });
});
