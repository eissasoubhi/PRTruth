import type { VerificationReport } from "./types.js";

const BADGE_COLOR: Record<VerificationReport["verdict"], string> = {
  PROVEN: "brightgreen",
  FAILED: "red",
  NOT_PROVEN: "yellow"
};

export function verificationBadgeUrl(verdict: VerificationReport["verdict"]): string {
  const label = verdict === "NOT_PROVEN" ? "NOT%20PROVEN" : verdict;
  return `https://img.shields.io/badge/PRTruth-${label}-${BADGE_COLOR[verdict]}`;
}

export function renderVerificationBadge(report: VerificationReport): string {
  const altVerdict = report.verdict === "NOT_PROVEN" ? "NOT PROVEN" : report.verdict;
  return `[![PRTruth: ${altVerdict}](${verificationBadgeUrl(report.verdict)})](https://github.com/${report.repository})`;
}
