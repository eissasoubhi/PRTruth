import { describe, expect, it } from 'vitest';
import { extractClaims, extractRequirements } from '../src/extract.js';

describe('extractRequirements', () => {
  it('prefers explicit task-list and acceptance-criteria requirements', () => {
    const requirements = extractRequirements(
      `## Acceptance Criteria\n- Export endpoint exists\n- [ ] Admin access is required\n- Maximum 10,000 records\n`,
      'Add CSV export',
    );

    expect(requirements.map((requirement) => requirement.text)).toEqual([
      'Admin access is required',
      'Export endpoint exists',
      'Maximum 10,000 records',
    ]);
  });

  it('falls back to the issue title', () => {
    expect(extractRequirements('Just some context.', 'Fix checkout race')).toEqual([
      { id: 'R1', text: 'Fix checkout race', source: 'issue-title' },
    ]);
  });
});

describe('extractClaims', () => {
  it('detects completion-style claims', () => {
    const claims = extractClaims('- Added tests\n- Updated docs\n\nAll tests pass. No breaking changes.');
    expect(claims.some((claim) => /Added tests/i.test(claim))).toBe(true);
    expect(claims.some((claim) => /tests pass/i.test(claim))).toBe(true);
  });
});
