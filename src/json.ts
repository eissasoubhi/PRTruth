import type { VerificationReport } from "./types.js";

export interface VerificationReceipt {
  schemaVersion: "1";
  generatedAt: string;
  report: VerificationReport;
}

export function createVerificationReceipt(
  report: VerificationReport,
  generatedAt = new Date()
): VerificationReceipt {
  return {
    schemaVersion: "1",
    generatedAt: generatedAt.toISOString(),
    report
  };
}

export function renderJson(
  report: VerificationReport,
  generatedAt = new Date()
): string {
  return JSON.stringify(createVerificationReceipt(report, generatedAt), null, 2);
}
