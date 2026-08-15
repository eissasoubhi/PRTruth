import type { Evidence, VerificationReport } from "./types.js";

const SYMBOL = {
  PROVEN: "✓",
  FAILED: "✗",
  UNPROVEN: "⚠"
} as const;

function evidenceLabel(evidence: Evidence): string {
  return evidence.url ? `${evidence.summary} (${evidence.url})` : evidence.summary;
}

function markdownEvidence(evidence: Evidence): string {
  const summary = evidence.summary.replace(/\|/g, "\\|");
  return evidence.url ? `[${summary}](${evidence.url})` : summary;
}

function claimFactCheck(status: "PROVEN" | "FAILED" | "UNPROVEN"): string {
  if (status === "UNPROVEN") {
    return `${SYMBOL[status]} **${status}** — unsupported`;
  }
  if (status === "FAILED") {
    return `${SYMBOL[status]} **${status}** — contradicted`;
  }
  return `${SYMBOL[status]} **${status}**`;
}

export function renderTerminal(report: VerificationReport): string {
  const rows = report.results.map((result) => {
    const label = result.requirement.text.length > 52
      ? `${result.requirement.text.slice(0, 49)}...`
      : result.requirement.text;
    return `${label.padEnd(55)} ${SYMBOL[result.status]} ${result.status}`;
  });

  const evidence = report.results.flatMap((result) =>
    result.evidence.map((item) => `  ${SYMBOL[result.status]} ${result.requirement.id}: ${evidenceLabel(item)}`)
  );
  const proven = report.results.filter((result) => result.status === "PROVEN").length;

  return [
    `PRTruth — ${report.repository}#${report.prNumber}`,
    `Issue #${report.issueNumber}: ${report.issueTitle}`,
    "",
    "Requirement                                             Result",
    "────────────────────────────────────────────────────────────────────",
    ...(rows.length > 0 ? rows : ["No acceptance criteria detected.                       ⚠ UNPROVEN"]),
    ...(evidence.length > 0 ? ["", "Evidence", "────────────────────────────────────────────────────────────────────", ...evidence] : []),
    "",
    `Verdict: ${report.verdict}`,
    `${proven} / ${report.results.length} requirements proven`
  ].join("\n");
}

export function renderMarkdown(report: VerificationReport): string {
  const body = report.results.length > 0
    ? report.results
        .map((result) => {
          const requirement = result.requirement.text.replace(/\|/g, "\\|");
          const reason = result.reason.replace(/\|/g, "\\|");
          const evidence = result.evidence.length > 0
            ? result.evidence.map(markdownEvidence).join("<br>")
            : "—";
          return `| ${requirement} | ${SYMBOL[result.status]} **${result.status}** | ${reason} | ${evidence} |`;
        })
        .join("\n")
    : "| No acceptance criteria detected | ⚠ **UNPROVEN** | Add explicit acceptance criteria to the issue. | — |";

  const claimBody = report.claimResults?.map((result) => {
    const claim = result.claim.text.replace(/\|/g, "\\|");
    return `| ${claim} | ${claimFactCheck(result.status)} |`;
  }).join("\n");

  return [
    `## PRTruth — ${report.verdict}`,
    "",
    `Issue #${report.issueNumber}: **${report.issueTitle}**`,
    "",
    "| Requirement | Result | Evidence assessment | Concrete evidence |",
    "|---|---|---|---|",
    body,
    ...(claimBody
      ? [
          "",
          "### Completion claims",
          "",
          "| Claim | Fact check |",
          "|---|---|",
          claimBody
        ]
      : []),
    "",
    `Changed files: ${report.changedFiles.length} · Checks observed: ${report.checks.length}`
  ].join("\n");
}
