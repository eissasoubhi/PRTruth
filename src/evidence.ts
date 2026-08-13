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

function normalizeToken(token: string): string {
  if (/^reports?$/.test(token)) return 'report';
  if (/^requirements?$/.test(token)) return 'requirement';
  if (/^tests?$/.test(token)) return 'test';
  if (/^formats?$/.test(token)) return 'format';
  if (/^outputs?$/.test(token)) return 'output';
  if (/^claims?$/.test(token)) return 'claim';
  if (/^contributors?$|^contributing$|^contributions?$/.test(token)) return 'contribut';
  if (/^documentation$|^documents?$|^docs?$/.test(token)) return 'document';
  if (/^licensing$|^licensed$|^licenses?$|^licences?$/.test(token)) return 'license';
  if (/^classified$|^classifies$|^classifying$|^classification$/.test(token)) return 'classify';
  return token;
}

function tokens(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .map(normalizeToken);
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

type ArtifactConcept = {
  label: string;
  mentions: RegExp;
  files: RegExp[];
};

const artifactConcepts: ArtifactConcept[] = [
  { label: 'license', mentions: /\blicen[cs](?:e|ing|ed|es)?\b/i, files: [/(^|\/)LICENSE(?:\.|$)/i] },
  {
    label: 'contributor documentation',
    mentions: /\bcontribut(?:or|ors|ing|ion|ions)?\b/i,
    files: [/(^|\/)CONTRIBUTING(?:\.|$)/i],
  },
  {
    label: 'documentation',
    mentions: /\b(?:documentation|docs?|documents?)\b/i,
    files: [/(^|\/)CONTRIBUTING(?:\.|$)/i, /(^|\/)README(?:\.|$)/i, /(^|\/)docs?\//i],
  },
  { label: 'readme', mentions: /\breadme\b/i, files: [/(^|\/)README(?:\.|$)/i] },
];

function assessArtifactRequirement(
  requirement: Requirement,
  files: ChangedFile[],
): RequirementAssessment | null {
  const required = artifactConcepts.filter((concept) => concept.mentions.test(requirement.text));
  if (required.length === 0) return null;

  const evidence: EvidenceItem[] = [];
  const missing: string[] = [];

  for (const concept of required) {
    const matching = files.find((file) => concept.files.some((pattern) => pattern.test(file.filename)));
    if (matching) {
      if (!evidence.some((item) => item.label === matching.filename)) {
        evidence.push({ kind: 'file', label: matching.filename, detail: `${concept.label} artifact present in diff` });
      }
    } else {
      missing.push(concept.label);
    }
  }

  if (missing.length === 0) {
    return {
      requirement,
      state: 'proven',
      evidence,
      reason: 'Required repository artifacts are present in the pull request.',
    };
  }

  return {
    requirement,
    state: 'unproven',
    evidence,
    reason: `Missing artifact evidence for: ${missing.join(', ')}.`,
  };
}

export function assessRequirement(
  requirement: Requirement,
  files: ChangedFile[],
  checks: CheckEvidence[],
): RequirementAssessment {
  const artifactAssessment = assessArtifactRequirement(requirement, files);
  if (artifactAssessment) return artifactAssessment;

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

  const requirementTokens = tokens(requirement.text);
  const minimumScore = requirementTokens.length >= 8 ? 2 : 1;
  const ranked = files
    .map((file) => ({ file, score: overlapScore(requirement, `${file.filename}\n${file.patch ?? ''}`) }))
    .filter(({ score }) => score >= minimumScore)
    .sort((a, b) => b.score - a.score);

  const implementation = ranked.filter(({ file }) => !isTestFile(file.filename));
  const tests = ranked.filter(({ file }) => isTestFile(file.filename));

  for (const match of implementation.slice(0, 3)) {
    evidence.push({ kind: 'file', label: match.file.filename, detail: `semantic token overlap ${match.score}` });
  }
  for (const match of tests.slice(0, 3)) {
    evidence.push({ kind: 'test', label: match.file.filename, detail: `semantic token overlap ${match.score}` });
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
