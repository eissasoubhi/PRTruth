import type { VerificationReport } from "./types.js";

const SYMBOL = {
  PROVEN: "✓",
  FAILED: "✗",
  UNPROVEN: "⚠"
} as const;

export function renderTerminal(report: VerificationReport): string {
  const rows = report.results.map((result) => {
    const label = result.requirement.text.length > 52
      ? `${result.requirement.text.slice(0, 49)}...`
      : result.requirement.text;
    return `${label.padEnd(55)} ${SYMBOL[result.status]} ${result.status}`;
  });

  const proven = report.results.filter((result) => result.status === "PROVEN").length;

  return [
    `PRTruth — ${report.repository}#${report.prNumber}`,
    `Issue #${report.issueNumber}: ${report.issueTitle}`,
    "",
    "Requirement                                             Result",
    "────────────────────────────────────────────────────────────────────",
    ...(rows.length > 0 ? rows : ["No acceptance criteria detected.                       ⚠ UNPROVEN"]),
    "",
    `Verdict: ${report.verdict}`,
    `${proven} / ${report.results.length} requirements proven`
  ].join("\n");
}

export function renderMarkdown(report: VerificationReport): string {
  const body = report.results.length > 0
    ? report.results
        .map((result) => `| ${result.requirement.text.replace(/\|/g, "\\|")} | ${SYMBOL[result.status]} **${result.status}** | ${result.reason.replace(/\|/g, "\\|")} |`)
        .join("\n")
    : "| No acceptance criteria detected | ⚠ **UNPROVEN** | Add explicit acceptance criteria to the issue. |";

  return [
    `## PRTruth — ${report.verdict}`,
    "",
    `Issue #${report.issueNumber}: **${report.issueTitle}**`,
    "",
    "| Requirement | Result | Evidence assessment |",
    "|---|---|---|",
    body,
    "",
    `Changed files: ${report.changedFiles.length} · Checks observed: ${report.checks.length}`
  ].join("\n");
}
