import { describe, expect, it } from 'vitest';
import { assessRequirement, overallVerdict } from '../src/evidence.js';
import type { ChangedFile, CheckEvidence, Requirement } from '../src/types.js';

const requirement: Requirement = {
  id: 'R1',
  text: 'Customer export endpoint exists',
  source: 'issue-section',
};

const implementation: ChangedFile = {
  filename: 'src/customer/export.ts',
  status: 'added',
  additions: 40,
  deletions: 0,
  patch: '+ export customer endpoint',
};

const test: ChangedFile = {
  filename: 'tests/customer/export.test.ts',
  status: 'added',
  additions: 30,
  deletions: 0,
  patch: '+ customer export endpoint test',
};

describe('assessRequirement', () => {
  it('proves a requirement when matching implementation and test evidence exist', () => {
    expect(assessRequirement(requirement, [implementation, test], []).state).toBe('proven');
  });

  it('keeps implementation-only evidence unproven', () => {
    expect(assessRequirement(requirement, [implementation], []).state).toBe('unproven');
  });

  it('fails an explicit test requirement when the matching check fails', () => {
    const checks: CheckEvidence[] = [
      { name: 'unit tests', status: 'completed', conclusion: 'failure', source: 'check-run' },
    ];
    const assessment = assessRequirement(
      { id: 'R2', text: 'All tests pass', source: 'issue-section' },
      [],
      checks,
    );
    expect(assessment.state).toBe('failed');
  });

  it('proves repository artifact requirements from concrete files in the diff', () => {
    const files: ChangedFile[] = [
      { filename: 'LICENSE', status: 'added', additions: 21, deletions: 0 },
      { filename: 'CONTRIBUTING.md', status: 'added', additions: 35, deletions: 0 },
    ];
    const assessment = assessRequirement(
      {
        id: 'R3',
        text: 'The repository includes MIT licensing and contributor documentation',
        source: 'issue-section',
      },
      files,
      [],
    );
    expect(assessment.state).toBe('proven');
    expect(assessment.evidence.map((item) => item.label)).toEqual(['LICENSE', 'CONTRIBUTING.md']);
  });
});

describe('overallVerdict', () => {
  it('is strict when anything remains unproven', () => {
    const proven = assessRequirement(requirement, [implementation, test], []);
    const unproven = assessRequirement({ ...requirement, id: 'R2', text: 'No breaking changes' }, [], []);
    expect(overallVerdict([proven, unproven])).toBe('unproven');
  });
});
