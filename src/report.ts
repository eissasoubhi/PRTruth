import type { Evidence, EvidenceStatus, VerificationReport } from "./types.js";

const SYMBOL = {
  PROVEN: "✓",
  FAILED: "✗",
  UNPROVEN: "⚠"
} as const;

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m"
} as const;

export interface TerminalRenderOptions {
  color?: boolean;
}

function evidenceLabel(evidence: Evidence): string {
  return evidence.url ? `${evidence.summary} (${evidence.url})` : evidence.summary;
}

function markdownEvidence(evidence: Evidence): string {
  const summary = evidence.summary.replace(/\|/g, "\\|");
  return evidence.url ? `[${summary}](${evidence.url})` : summary;
}

function claimFactCheck(status: EvidenceStatus): string {
  if (status === "UNPROVEN") {
    return `${SYMBOL[status]} **${status}** — unsupported`;
  }
  if (status === "FAILED") {
    return `${SYMBOL[status]} **${status}** — contradicted`;
  }
  return `${SYMBOL[status]} **${status}**`;
}

function terminalLabel(text: string): string {
  return text.length > 52 ? `${text.slice(0, 49)}...` : text;
}

function styled(text: string, enabled: boolean, ...codes: string[]): string {
  return enabled ? `${codes.join("")}${text}${ANSI.reset}` : text;
}

function statusColor(status: EvidenceStatus): string {
  if (status === "PROVEN") {
    return ANSI.green;
  }
  if (status === "FAILED") {
    return ANSI.red;
  }
  return ANSI.yellow;
}

function verdictColor(verdict: VerificationReport["verdict"]): string {
  if (verdict === "PROVEN") {
    return ANSI.green;
  }
  if (verdict === "FAILED") {
    return ANSI.red;
  }
  return ANSI.yellow;
}

function terminalStatus(status: EvidenceStatus, color: boolean): string {
  return styled(`${SYMBOL[status]} ${status}`, color, ANSI.bold, statusColor(status));
}

function terminalSymbol(status: EvidenceStatus, color: boolean): string {
  return styled(SYMBOL[status], color, statusColor(status));
}

function heading(text: string, color: boolean): string {
  return styled(text, color, ANSI.bold, ANSI.cyan);
}

function rule(color: boolean): string {
  return styled("────────────────────────────────────────────────────────────────────", color, ANSI.dim);
}

export function renderTerminal(
  report: VerificationReport,
  options: TerminalRenderOptions = {}
): string {
  const color = options.color ?? false;
  const rows = report.results.map((result) => {
    const label = terminalLabel(result.requirement.text);
    return `${label.padEnd(55)} ${terminalStatus(result.status, color)}`;
  });

  const evidence = report.results.flatMap((result) =>
    result.evidence.map(
      (item) => `  ${terminalSymbol(result.status, color)} ${result.requirement.id}: ${evidenceLabel(item)}`
    )
  );
  const claimRows = report.claimResults?.map((result) => {
    const label = terminalLabel(result.claim.text);
    return `${label.padEnd(55)} ${terminalStatus(result.status, color)}`;
  }) ?? [];
  const claimDetails = report.claimResults?.flatMap((result) => [
    `  ${terminalSymbol(result.status, color)} ${result.claim.id}: ${result.reason}`,
    ...result.evidence.map((item) => `    Evidence: ${evidenceLabel(item)}`)
  ]) ?? [];
  const proven = report.results.filter((result) => result.status === "PROVEN").length;

  return [
    heading(`PRTruth — ${report.repository}#${report.prNumber}`, color),
    `Issue #${report.issueNumber}: ${report.issueTitle}`,
    "",
    heading("Requirement                                             Result", color),
    rule(color),
    ...(rows.length > 0
      ? rows
      : [`No acceptance criteria detected.                       ${terminalStatus("UNPROVEN", color)}`]),
    ...(evidence.length > 0 ? ["", heading("Evidence", color), rule(color), ...evidence] : []),
    ...(claimRows.length > 0
      ? [
          "",
          heading("Completion claims", color),
          rule(color),
          ...claimRows,
          "",
          heading("Claim explanations", color),
          rule(color),
          ...claimDetails
        ]
      : []),
    "",
    `${styled("Verdict:", color, ANSI.bold)} ${styled(report.verdict, color, ANSI.bold, verdictColor(report.verdict))}`,
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
    const reason = result.reason.replace(/\|/g, "\\|");
    const evidence = result.evidence.length > 0
      ? result.evidence.map(markdownEvidence).join("<br>")
      : "—";
    return `| ${claim} | ${claimFactCheck(result.status)} | ${reason} | ${evidence} |`;
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
          "| Claim | Fact check | Why | Concrete evidence |",
          "|---|---|---|---|",
          claimBody
        ]
      : []),
    "",
    `Changed files: ${report.changedFiles.length} · Checks observed: ${report.checks.length}`
  ].join("\n");
}
