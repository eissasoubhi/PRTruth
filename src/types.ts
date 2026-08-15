export type EvidenceStatus = "PROVEN" | "FAILED" | "UNPROVEN";

export interface Requirement {
  id: string;
  text: string;
  source: "issue-checklist" | "acceptance-section" | "issue-list";
  checked?: boolean;
}

export interface CompletionClaim {
  id: string;
  text: string;
  source: "checked-checklist" | "claim-section";
}

export interface Evidence {
  kind: "ci" | "diff" | "issue" | "repository";
  summary: string;
  details?: string;
  url?: string;
}

export interface RequirementResult {
  requirement: Requirement;
  status: EvidenceStatus;
  reason: string;
  evidence: Evidence[];
}

export interface CheckRunSummary {
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl?: string;
}

export interface RepositoryInstruction {
  path: string;
  htmlUrl?: string;
}

export interface VerificationReport {
  repository: string;
  issueNumber: number;
  issueTitle: string;
  prNumber: number;
  prTitle: string;
  claims?: CompletionClaim[];
  changedFiles: string[];
  checks: CheckRunSummary[];
  instructions: RepositoryInstruction[];
  results: RequirementResult[];
  verdict: "PROVEN" | "FAILED" | "NOT_PROVEN";
}
