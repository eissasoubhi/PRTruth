import type {
  ChangedFile,
  CheckEvidence,
  EvidenceItem,
  EvidenceState,
  Requirement,
  RequirementAssessment,
} from './types.js';

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it',
  'of', 'on', 'or', 'should', 'that', 'the', 'this', 'to', 'with', 'must', 'when', 'all', 'no',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function overlapScore(requirement: Requirement, haystack: string): number {
  const target = new Set(tokens(haystack));
  return tokens(requirement.text).reduce((score, token) => score + (target.has(token) ? 1 : 0), 0);
}

function isTestFile(path: string): boolean {
  return /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(test|spec)\.[^.]+$/i.test(path);
}

function isSuccessful(check: CheckEvidence): boolean {
  return ['success', 'neutral', 'skipped'].includes((check.conclusion ?? check.status).toLowerCase());
}

function isFailed(check: CheckEvidence): boolean {
  return ['failure', 'failed', 'error', 'cancelled', 'timed_out', 'action_required'].includes(
    (check.conclusion ?? check.status).toLowerCase(),
  );
}

function checkKind(text: string): 'test' | 'lint' | 'typecheck' | 'build' | 'compat' | null {
  const value = text.toLowerCase();
  if (/backward|breaking|compatib|contract/.test(value)) return 'compat';
  if (/type[ -]?check|typescript/.test(value)) return 'typecheck';
  if (/lint|eslint|phpstan|pylint/.test(value)) return 'lint';
  if (/build|compile/.test(value)) return 'build';
  if (/test|spec/.test(value)) return 'test';
  return null;
}

export function assessRequirement(
  requirement: Requirement,
  files: ChangedFile[],
  checks: CheckEvidence[],
): RequirementAssessment {
  const evidence: EvidenceItem[] = [];
  const requiredCheckKind = checkKind(requirement.text);

  if (requiredCheckKind) {
    const relevantChecks = checks.filter((check) => checkKind(check.name) === requiredCheckKind);
    for (const check of relevantChecks) {
      evidence.push({ kind: 'check', label: check.name, detail: check.conclusion ?? check.status });
    }
    if (relevantChecks.some(isFailed)) {
      return { requirement, state: 'failed', evidence, reason: 'A relevant CI/check signal failed.' };
    }
    if (relevantChecks.length > 0 && relevantChecks.every(isSuccessful)) {
      return { requirement, state: 'proven', evidence, reason: 'A relevant CI/check signal completed successfully.' };
    }
    if (requiredCheckKind === 'compat') {
      return {
        requirement,
        state: 'unproven',
        evidence,
        reason: 'Compatibility claims require an explicit compatibility/contract signal.',
      };
    }
  }

  const ranked = files
    .map((file) => ({ file, score: overlapScore(requirement, `${file.filename}\n${file.patch ?? ''}`) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const implementation = ranked.filter(({ file }) => !isTestFile(file.filename));
  const tests = ranked.filter(({ file }) => isTestFile(file.filename));

  for (const match of implementation.slice(0, 3)) {
    evidence.push({ kind: 'file', label: match.file.filename, detail: `keyword overlap ${match.score}` });
  }
  for (const match of tests.slice(0, 3)) {
    evidence.push({ kind: 'test', label: match.file.filename, detail: `keyword overlap ${match.score}` });
  }

  if (implementation.length > 0 && tests.length > 0) {
    return {
      requirement,
      state: 'proven',
      evidence,
      reason: 'The diff contains matching implementation and test evidence.',
    };
  }

  if (implementation.length > 0) {
    return {
      requirement,
      state: 'unproven',
      evidence,
      reason: 'Implementation evidence exists, but no matching verification evidence was found.',
    };
  }

  return {
    requirement,
    state: 'unproven',
    evidence,
    reason: 'No concrete evidence could be mapped to this requirement.',
  };
}

export function overallVerdict(assessments: RequirementAssessment[]): EvidenceState {
  if (assessments.some((assessment) => assessment.state === 'failed')) return 'failed';
  if (assessments.length > 0 && assessments.every((assessment) => assessment.state === 'proven')) return 'proven';
  return 'unproven';
}
