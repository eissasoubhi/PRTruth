import { describe, expect, it } from 'vitest';
import { renderJson, renderMarkdown, renderTerminal } from '../src/report.js';
import type { VerificationReport } from '../src/types.js';

const report: VerificationReport = {
  repository: 'eissasoubhi/PRTruth',
  issue: { number: 1, title: 'Bootstrap', html_url: 'https://example.com/issues/1' },
  pullRequest: { number: 1, title: 'Bootstrap', html_url: 'https://example.com/pull/1' },
  assessments: [
    {
      requirement: { id: 'R1', text: 'Reports support all output formats', source: 'issue-section' },
      state: 'proven',
      evidence: [{ kind: 'test', label: 'tests/report.test.ts' }],
      reason: 'Verified by reporter tests.',
    },
  ],
  instructionFiles: ['CONTRIBUTING.md'],
  claims: [],
  verdict: 'proven',
};

describe('reporters', () => {
  it('renders terminal output', () => {
    const output = renderTerminal(report);
    expect(output).toContain('PRTruth');
    expect(output).toContain('PROVEN');
  });

  it('renders Markdown output', () => {
    const output = renderMarkdown(report);
    expect(output).toContain('## PRTruth evidence report');
    expect(output).toContain('| R1 |');
  });

  it('renders JSON output', () => {
    const output = renderJson(report);
    expect(JSON.parse(output)).toMatchObject({ repository: 'eissasoubhi/PRTruth', verdict: 'proven' });
  });
});
