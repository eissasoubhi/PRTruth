import { describe, expect, it } from "vitest";
import { requiresPreFixFailureEvidence } from "../src/historical-evidence.js";

describe("requiresPreFixFailureEvidence", () => {
  it("detects explicit red-first and pre-fix failure requirements", () => {
    for (const text of [
      "Component test passes and was failing before the fix",
      "Regression test failed prior to the fix",
      "The test is red-first and green after the change",
      "The test fails against the pre-fix implementation",
      "The test failed on the previous version"
    ]) {
      expect(requiresPreFixFailureEvidence(text), text).toBe(true);
    }
  });

  it("does not block ordinary current-head test requirements", () => {
    for (const text of [
      "Component tests pass",
      "Regression tests cover the sanitizer behavior",
      "Unit tests are green on Ubuntu",
      "The previous regression test still passes"
    ]) {
      expect(requiresPreFixFailureEvidence(text), text).toBe(false);
    }
  });
});
