import { describe, expect, it } from "vitest";
import { createVerificationReceipt, renderJson } from "../src/json.js";
import type { VerificationReport } from "../src/types.js";

const report: VerificationReport = {
  repository: "acme/widget",
  issueNumber: 12,
  issueTitle: "Export customers",
  prNumber: 14,
  prTitle: "feat: export customers",
  changedFiles: ["src/export.ts"],
  checks: [],
  results: [],
  verdict: "NOT_PROVEN"
};

describe("verification JSON receipt", () => {
  it("wraps the report in a stable schema envelope", () => {
    const generatedAt = new Date("2026-08-14T10:00:00.000Z");
    const receipt = createVerificationReceipt(report, generatedAt);

    expect(receipt.schemaVersion).toBe("1");
    expect(receipt.generatedAt).toBe("2026-08-14T10:00:00.000Z");
    expect(receipt.report).toEqual(report);
  });

  it("renders valid JSON", () => {
    const json = renderJson(report, new Date("2026-08-14T10:00:00.000Z"));
    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: "1",
      report: { repository: "acme/widget", prNumber: 14 }
    });
  });
});
