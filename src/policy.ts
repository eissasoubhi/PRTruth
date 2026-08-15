import type { VerificationReport } from "./types.js";

export type VerificationPolicy = "strict" | "failures-only" | "report-only";

export function parseVerificationPolicy(value: string): VerificationPolicy {
  if (value === "strict" || value === "failures-only" || value === "report-only") {
    return value;
  }

  throw new Error(
    `Unknown verification policy: ${value}. Use strict, failures-only, or report-only.`
  );
}

export function shouldFailVerification(
  verdict: VerificationReport["verdict"],
  policy: VerificationPolicy
): boolean {
  if (policy === "report-only") return false;
  if (policy === "failures-only") return verdict === "FAILED";
  return verdict !== "PROVEN";
}
