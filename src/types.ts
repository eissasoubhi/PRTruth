export type EvidenceState = 'proven' | 'failed' | 'unproven';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  head: { sha: string };
}

export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface CheckEvidence {
  name: string;
  status: string;
  conclusion: string | null;
  source: 'check-run' | 'commit-status';
}

export interface Requirement {
  id: string;
  text: string;
  source: 'issue-task' | 'issue-section' | 'issue-title';
}

export interface EvidenceItem {
  kind: 'file' | 'test' | 'check' | 'instruction';
  label: string;
  detail?: string;
}

export interface RequirementAssessment {
  requirement: Requirement;
  state: EvidenceState;
  evidence: EvidenceItem[];
  reason: string;
}

export interface VerificationReport {
  repository: string;
  issue: Pick<GitHubIssue, 'number' | 'title' | 'html_url'>;
  pullRequest: Pick<GitHubPullRequest, 'number' | 'title' | 'html_url'>;
  assessments: RequirementAssessment[];
  instructionFiles: string[];
  claims: string[];
  verdict: EvidenceState;
}
