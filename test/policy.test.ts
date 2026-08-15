import { describe, expect, it } from "vitest";
import { parseVerificationPolicy, shouldFailVerification } from "../src/policy.js";

describe("verification policy", () => {
  it("keeps strict mode as the default semantics", () => {
    expect(shouldFailVerification("PROVEN", "strict")).toBe(false);
    expect(shouldFailVerification("NOT_PROVEN", "strict")).toBe(true);
    expect(shouldFailVerification("FAILED", "strict")).toBe(true);
  });

  it("can block only on explicit failures", () => {
    expect(shouldFailVerification("PROVEN", "failures-only")).toBe(false);
    expect(shouldFailVerification("NOT_PROVEN", "failures-only")).toBe(false);
    expect(shouldFailVerification("FAILED", "failures-only")).toBe(true);
  });

  it("supports report-only mode", () => {
    expect(shouldFailVerification("PROVEN", "report-only")).toBe(false);
    expect(shouldFailVerification("NOT_PROVEN", "report-only")).toBe(false);
    expect(shouldFailVerification("FAILED", "report-only")).toBe(false);
  });

  it("rejects unknown policy values", () => {
    expect(() => parseVerificationPolicy("lenient")).toThrow(/Unknown verification policy/);
  });
});
