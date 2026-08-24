import { assessCompletionClaim, buildClaimResults } from "./claim-evidence.js";
import { assessGenericCiSuccess } from "./ci-evidence.js";
import { extractCompletionClaims } from "./claims.js";
import {
  selectTrustedCommentRequirements,
  shouldInspectIssueComments
} from "./comment-requirements.js";
import {
  findPatchCandidateEvidence,
  findQuantitativePatchMismatchEvidence,
  type PatchFile
} from "./diff-evidence.js";
import { GitHubClient } from "./github.js";
import {
  PRE_FIX_FAILURE_UNPROVEN_REASON,
  requiresPreFixFailureEvidence
} from "./historical-evidence.js";
import { discoverInstructionFiles } from "./instructions.js";
import { resolveIssueNumber } from "./linked-issue.js";
import {
  QUANTIFIED_COUNT_UNPROVEN_REASON,
  requiresQuantifiedArtifactCountEvidence
} from "./quantitative-guard.js";
import { extractRequirements } from "./requirements.js";
import type {
  CheckRunSummary,
  ClaimResult,
  Requirement,
  RequirementResult,
  RequiredStatusCheck,
  VerificationReport
} from "./types.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "must", "should",
  "have", "has", "are", "was", "were", "will", "not", "all", "any", "can", "its", "their", "our",
  "les", "des", "une", "dans", "avec", "pour", "que", "qui", "sur", "est", "être", "doit", "doivent"
]);

function tokenize(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_./-]+/gi, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
  )];
}

function hasSuccessLanguage(text: string): boolean {
  return /\b(?:pass(?:es|ed)?|succeed(?:s|ed)?|success(?:ful(?:ly)?)?|green|complete(?:s|d)?)\b/i.test(text);
}

function isRequiredChecksSuccessStatement(text: string): boolean {
  return /\brequired\b[^.\n]{0,80}\b(?:ci|checks?|workflows?|jobs?)\b/i.test(text)
    || /\b(?:ci|checks?|workflows?|jobs?)\b[^.\n]{0,80}\brequired\b/i.test(text);
}

function checkCategory(text: string): string | null {
  if (!hasSuccessLanguage(text)) return null;
  if (/\btests?\b|\btest suite\b/i.test(text)) return "test";
  if (/\blint\b|eslint|phpstan|static analysis/i.test(text)) return "lint";
  if (/type[ -]?check|typescript/i.test(text)) return "type";
  if (/\bbuild\b|compile/i.test(text)) return "build";
  return null;
}

function ciAssessmentToRequirementResult(
  requirement: Requirement,
  assessment: ReturnType<typeof assessCompletionClaim>
): RequirementResult {
  return {
    requirement,
    status: assessment.status,
    reason: assessment.reason,
    evidence: assessment.matchedChecks.map((check) => ({
      kind: "ci" as const,
      summary: `${check.name}: ${check.conclusion ?? check.status}`,
      ...(check.htmlUrl ? { url: check.htmlUrl } : {})
    }))
  };
}

function guardQuantifiedRequirement(result: RequirementResult): RequirementResult {
  if (
    result.status === "PROVEN"
    && requiresQuantifiedArtifactCountEvidence(result.requirement.text)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: QUANTIFIED_COUNT_UNPROVEN_REASON
    };
  }
  return result;
}

function guardQuantifiedClaim(result: ClaimResult): ClaimResult {
  if (
    result.status === "PROVEN"
    && requiresQuantifiedArtifactCountEvidence(result.claim.text)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: QUANTIFIED_COUNT_UNPROVEN_REASON
    };
  }
  return result;
}

function evaluateRequirement(
  requirement: Requirement,
  files: PatchFile[],
  checks: CheckRunSummary[],
  requiredCheckContexts: RequiredStatusCheck[] | null
): RequirementResult {
  const category = checkCategory(requirement.text);
  if (category) {
    // A current-head green test can prove that a test passes now, but cannot
    // prove a historical red-first clause such as "failing before the fix".
    // Keep the whole conjunctive requirement UNPROVEN until before-state
    // execution evidence is represented explicitly.
    if (requiresPreFixFailureEvidence(requirement.text)) {
      return {
        requirement,
        status: "UNPROVEN",
        reason: PRE_FIX_FAILURE_UNPROVEN_REASON,
        evidence: []
      };
    }

    // Issue acceptance criteria and PR completion claims must use the same
    // scoped CI semantics. The old requirement-only path matched merely by
    // category name, which could let a generic green test job prove a stronger
    // requirement such as "Tests pass on Node 22 and Node 24".
    return ciAssessmentToRequirementResult(
      requirement,
      assessCompletionClaim(requirement.text, checks)
    );
  }

  const overallCi = assessGenericCiSuccess(requirement.text, checks, requiredCheckContexts);
  if (overallCi) {
    return {
      requirement,
      status: overallCi.status,
      reason: overallCi.reason,
      evidence: overallCi.matchedChecks.map((check) => ({
        kind: "ci" as const,
        summary: `${check.name}: ${check.conclusion ?? check.status}`,
        ...(check.htmlUrl ? { url: check.htmlUrl } : {})
      }))
    };
  }

  const quantitativeMismatch = findQuantitativePatchMismatchEvidence(requirement.text, files);
  if (quantitativeMismatch.length > 0) {
    return {
      requirement,
      status: "UNPROVEN",
      reason: "Patch evidence contains a possible quantitative mismatch that needs review before this requirement can be proven.",
      evidence: quantitativeMismatch
    };
  }

  const patchCandidates = findPatchCandidateEvidence(requirement.text, files);
  if (patchCandidates.length > 0) {
    return {
      requirement,
      status: "UNPROVEN",
      reason: "Patch lines are relevant, but textual diff matches alone do not prove the requirement.",
      evidence: patchCandidates
    };
  }

  const changedFiles = files.map((file) => file.filename);
  const terms = tokenize(requirement.text);
  const candidates = changedFiles.filter((file) => {
    const lower = file.toLowerCase();
    return terms.some((term) => lower.includes(term));
  });

  return {
    requirement,
    status: "UNPROVEN",
    reason:
      candidates.length > 0
        ? "Changed files are relevant, but file changes alone do not prove the requirement."
        : "No deterministic evidence currently proves this requirement.",
    evidence: candidates.slice(0, 5).map((file) => ({ kind: "diff", summary: `Changed file: ${file}` }))
  };
}

export async function verifyPullRequest(input: {
  repository: string;
  issueNumber?: number;
  prNumber: number;
  token?: string;
}): Promise<VerificationReport> {
  const client = new GitHubClient(input.token);
  const pull = await client.getPull(input.repository, input.prNumber);
  const issueNumber = resolveIssueNumber(input.issueNumber, pull.body ?? "");

  const [issue, files, instructions] = await Promise.all([
    client.getIssue(input.repository, issueNumber),
    client.getPullFiles(input.repository, input.prNumber),
    discoverInstructionFiles(client, input.repository)
  ]);
  const issueBody = issue.body ?? "";
  const issueComments = shouldInspectIssueComments(issueBody)
    ? await client.getIssueComments(input.repository, issueNumber)
    : [];

  const [checkRuns, workflowStepChecks, requiredCheckContexts] = await Promise.all([
    client.getCheckRuns(input.repository, pull.head.sha),
    client.getWorkflowStepChecks(input.repository, pull.head.sha),
    pull.base?.ref
      ? client.getRequiredStatusCheckContexts(input.repository, pull.base.ref)
      : Promise.resolve(null)
  ]);
  const checks: CheckRunSummary[] = [
    ...checkRuns.map((check) => ({
      name: check.name,
      status: check.status,
      conclusion: check.conclusion,
      scope: "check" as const,
      ...(check.html_url ? { htmlUrl: check.html_url } : {}),
      ...(check.app?.id ? { appId: check.app.id } : {})
    })),
    ...workflowStepChecks.map((check) => ({
      name: check.name,
      status: check.status,
      conclusion: check.conclusion,
      scope: "step" as const,
      ...(check.html_url ? { htmlUrl: check.html_url } : {})
    }))
  ];

  const commentRequirements = selectTrustedCommentRequirements(
    issueBody,
    issueComments.map((comment) => ({
      body: comment.body,
      authorAssociation: comment.author_association
    }))
  );
  const requirements = commentRequirements.length > 0
    ? commentRequirements
    : extractRequirements(issueBody);
  const claims = extractCompletionClaims(pull.body ?? "");
  const changedFiles = files.map((file) => file.filename);
  const claimResults = buildClaimResults(claims, checks, changedFiles)
    .map((result) => {
      if (!isRequiredChecksSuccessStatement(result.claim.text)) return result;

      const assessment = assessGenericCiSuccess(result.claim.text, checks, requiredCheckContexts);
      if (!assessment) return result;

      return {
        claim: result.claim,
        status: assessment.status,
        reason: assessment.reason,
        evidence: assessment.matchedChecks.map((check) => ({
          kind: "ci" as const,
          summary: `${check.name}: ${check.conclusion ?? check.status}`,
          ...(check.htmlUrl ? { url: check.htmlUrl } : {})
        }))
      };
    })
    .map(guardQuantifiedClaim);
  const results = requirements
    .map((requirement) => evaluateRequirement(requirement, files, checks, requiredCheckContexts))
    .map(guardQuantifiedRequirement);

  const verdict = results.some((result) => result.status === "FAILED")
    ? "FAILED"
    : results.length > 0 && results.every((result) => result.status === "PROVEN")
      ? "PROVEN"
      : "NOT_PROVEN";

  return {
    repository: input.repository,
    issueNumber,
    issueTitle: issue.title,
    prNumber: input.prNumber,
    prTitle: pull.title,
    claims,
    claimResults,
    changedFiles,
    checks,
    instructions,
    results,
    verdict
  };
}