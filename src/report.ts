import pc from 'picocolors';
import type { EvidenceState, VerificationReport } from './types.js';

const icon: Record<EvidenceState, string> = {
  proven: '✓',
  failed: '✗',
  unproven: '⚠',
};

function label(state: EvidenceState): string {
  return state.toUpperCase();
}

export function renderTerminal(report: VerificationReport): string {
  const lines = [
    pc.bold('PRTruth — evidence report'),
    '',
    `Repository: ${report.repository}`,
    `Issue #${report.issue.number}: ${report.issue.title}`,
    `PR    #${report.pullRequest.number}: ${report.pullRequest.title}`,
    '',
    pc.bold('Requirements'),
  ];

  for (const assessment of report.assessments) {
    const state = `${icon[assessment.state]} ${label(assessment.state)}`;
    lines.push(`${assessment.requirement.id}  ${assessment.requirement.text}`);
    lines.push(`    ${state} — ${assessment.reason}`);
    for (const evidence of assessment.evidence) {
      lines.push(`      • ${evidence.label}${evidence.detail ? ` (${evidence.detail})` : ''}`);
    }
  }

  lines.push('', pc.bold(`Verdict: ${label(report.verdict)}`));
  const proven = report.assessments.filter((assessment) => assessment.state === 'proven').length;
  lines.push(`${proven} / ${report.assessments.length} requirements proven`);

  if (report.instructionFiles.length > 0) {
    lines.push('', `Repository instructions: ${report.instructionFiles.join(', ')}`);
  }
  if (report.claims.length > 0) {
    lines.push('', `PR claims detected: ${report.claims.length}`);
  }

  return lines.join('\n');
}

export function renderMarkdown(report: VerificationReport): string {
  const rows = report.assessments.map((assessment) => {
    const evidence = assessment.evidence.map((item) => `\`${item.label}\``).join(', ') || '—';
    return `| ${assessment.requirement.id} | ${assessment.requirement.text.replace(/\|/g, '\\|')} | ${icon[assessment.state]} **${label(assessment.state)}** | ${evidence} |`;
  });

  return [
    '## PRTruth evidence report',
    '',
    `**Issue #${report.issue.number}:** ${report.issue.title}`,
    `**PR #${report.pullRequest.number}:** ${report.pullRequest.title}`,
    '',
    '| ID | Requirement | Result | Evidence |',
    '|---|---|---|---|',
    ...rows,
    '',
    `### Verdict: ${icon[report.verdict]} ${label(report.verdict)}`,
    '',
    `Repository instruction files: ${report.instructionFiles.length ? report.instructionFiles.map((file) => `\`${file}\``).join(', ') : 'none detected'}`,
  ].join('\n');
}

export function renderJson(report: VerificationReport): string {
  return JSON.stringify(report, null, 2);
}
