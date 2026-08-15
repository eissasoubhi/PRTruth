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

function terminalLabel(text: string): string {
  return text.length > 52 ? `${text.slice(0, 49)}...` : text;
}

function markdownText(text: string): string {
  return text.replace(/\|/g, "\\|");
}

export function renderTerminal(report: VerificationReport): string {
  const rows = report.results.map((result) => {
    const label = terminalLabel(result.requirement.text);
    return `${label.padEnd(55)} ${SYMBOL[result.status]} ${result.status}`;
  });

  const evidence = report.results.flatMap((result) =>
    result.evidence.map((item) => `  ${SYMBOL[result.status]} ${result.requirement.id}: ${evidenceLabel(item)}`)
  );
  const proven = report.results.filter((result) => result.status === "PROVEN").length;

  const claimResults = report.claimResults ?? [];
  const claimRows = claimResults.map((result) => {
    const label = terminalLabel(result.claim.text);
    return `${label.padEnd(55)} ${SYMBOL[result.status]} ${result.status}`;
  });
  const claimDetails = claimResults.flatMap((result) => [
    `  ${SYMBOL[result.status]} ${result.claim.id}: ${result.reason}`,
    ...result.evidence.map((item) => `    ↳ ${evidenceLabel(item)}`)
  ]);
  const claimsProven = claimResults.filter((result) => result.status === "PROVEN").length;

  return [
    `PRTruth — ${report.repository}#${report.prNumber}`,
    `Issue #${report.issueNumber}: ${report.issueTitle}`,
    "",
    "Requirement                                             Result",
    "────────────────────────────────────────────────────────────────────",
    ...(rows.length > 0 ? rows : ["No acceptance criteria detected.                       ⚠ UNPROVEN"]),
    ...(evidence.length > 0 ? ["", "Evidence", "────────────────────────────────────────────────────────────────────", ...evidence] : []),
    ...(claimRows.length > 0
      ? [
          "",
          "Completion claims",
          "────────────────────────────────────────────────────────────────────",
          ...claimRows,
          "",
          "Claim explanations",
          "────────────────────────────────────────────────────────────────────",
          ...claimDetails,
          `${claimsProven} / ${claimResults.length} completion claims proven`
        ]
      : []),
    "",
    `Verdict: ${report.verdict}`,
    `${proven} / ${report.results.length} requirements proven`
  ].join("\n");
}

export function renderMarkdown(report: VerificationReport): string {
  const body = report.results.length > 0
    ? report.results
        .map((result) => {
          const requirement = markdownText(result.requirement.text);
          const reason = markdownText(result.reason);
          const evidence = result.evidence.length > 0
            ? result.evidence.map(markdownEvidence).join("<br>")
            : "—";
          return `| ${requirement} | ${SYMBOL[result.status]} **${result.status}** | ${reason} | ${evidence} |`;
        })
        .join("\n")
    : "| No acceptance criteria detected | ⚠ **UNPROVEN** | Add explicit acceptance criteria to the issue. | — |";

  const claimResults = report.claimResults ?? [];
  const claims = claimResults.length > 0
    ? [
        "",
        "### Completion claims",
        "",
        "| Claim | Result | Why | Concrete evidence |",
        "|---|---|---|---|",
        ...claimResults.map((result) => {
          const claim = markdownText(result.claim.text);
          const reason = markdownText(result.reason);
          const evidence = result.evidence.length > 0
            ? result.evidence.map(markdownEvidence).join("<br>")
            : "—";
          return `| ${claim} | ${SYMBOL[result.status]} **${result.status}** | ${reason} | ${evidence} |`;
        })
      ]
    : [];

  return [
    `## PRTruth — ${report.verdict}`,
    "",
    `Issue #${report.issueNumber}: **${report.issueTitle}**`,
    "",
    "| Requirement | Result | Evidence assessment | Concrete evidence |",
    "|---|---|---|---|",
    body,
    ...claims,
    "",
    `Changed files: ${report.changedFiles.length} · Checks observed: ${report.checks.length}`
  ].join("\n");
}
