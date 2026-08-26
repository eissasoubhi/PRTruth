import { assessCompletionClaim, buildClaimResults } from "./claim-evidence.js";
import { assessGenericCiSuccess } from "./ci-evidence.js";
import { extractCompletionClaims } from "./claims.js";
import {
  selectTrustedCommentRequirements,
  selectTrustedSupportingCommentEvidence,
  shouldInspectIssueComments,
  shouldInspectSupportingComments
} from "./comment-requirements.js";
import {
  findPatchCandidateEvidence,
  findQuantitativePatchMismatchEvidence,
  type PatchFile
} from "./diff-evidence.js";
import { evidenceGateText } from "./evidence-gate-text.js";
import { inspectExactHeadPath } from "./exact-head-file.js";
import { GitHubClient } from "./github.js";
import {
  PRE_FIX_FAILURE_UNPROVEN_REASON,
  requiresPreFixFailureEvidence
} from "./historical-evidence.js";
import { discoverInstructionFiles } from "./instructions.js";
import { resolveIssueNumber } from "./linked-issue.js";
import {
  PACKAGED_RUNTIME_UNPROVEN_REASON,
  hasPackagedRuntimeExecutionEvidence,
  requiresPackagedRuntimeExecutionEvidence
} from "./packaged-runtime-evidence.js";
import {
  QUANTIFIED_COUNT_UNPROVEN_REASON,
  requiresQuantifiedArtifactCountEvidence
} from "./quantitative-guard.js";
import {
  assessExactHeadPathState,
  extractExplicitPathStateIntent
} from "./repository-state-evidence.js";
import { extractRequirements } from "./requirements.js";
import {
  guardSpecializedValidationClaim,
  guardSpecializedValidationRequirement
} from "./specialized-validation-evidence.js";
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

function guardHistoricalRequirement(result: RequirementResult): RequirementResult {
  if (
    result.status === "PROVEN"
    && requiresPreFixFailureEvidence(result.requirement.text)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: PRE_FIX_FAILURE_UNPROVEN_REASON
    };
  }
  return result;
}

function guardHistoricalClaim(result: ClaimResult): ClaimResult {
  if (
    result.status === "PROVEN"
    && requiresPreFixFailureEvidence(result.claim.text)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: PRE_FIX_FAILURE_UNPROVEN_REASON
    };
  }
  return result;
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

function guardPackagedRuntimeRequirement(result: RequirementResult): RequirementResult {
  if (
    result.status === "PROVEN"
    && requiresPackagedRuntimeExecutionEvidence(result.requirement.text)
    && !hasPackagedRuntimeExecutionEvidence(result.requirement.text, result.evidence)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: PACKAGED_RUNTIME_UNPROVEN_REASON
    };
  }
  return result;
}

function guardPackagedRuntimeClaim(result: ClaimResult): ClaimResult {
  if (
    result.status === "PROVEN"
    && requiresPackagedRuntimeExecutionEvidence(result.claim.text)
    && !hasPackagedRuntimeExecutionEvidence(result.claim.text, result.evidence)
  ) {
    return {
      ...result,
      status: "UNPROVEN",
      reason: PACKAGED_RUNTIME_UNPROVEN_REASON
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
    // Issue acceptance criteria and PR completion claims must use the same
    // scoped CI semantics. The old requirement-only path matched merely by
    // category name, which could let a generic green test job prove a stronger
    // requirement such as "Tests pass on Node 22 and Node 24".
    // Explicitly excluded operator-side validation is removed only from the
    // evidence-matching text so an out-of-gate platform mention cannot become
    // an accidental required CI scope. The report still retains the original
    // acceptance criterion verbatim.
    // Historical red-first clauses are guarded after assessment so an observed
    // current-head failure still remains FAILED rather than being hidden.
    return guardHistoricalRequirement(ciAssessmentToRequirementResult(
      requirement,
      assessCompletionClaim(evidenceGateText(requirement.text), checks)
    ));
  }

  const overallCi = assessGenericCiSuccess(requirement.text, checks, requiredCheckContexts);
  if (overallCi) {
    return guardHistoricalRequirement({
      requirement,
      status: overallCi.status,
      reason: overallCi.reason,
      evidence: overallCi.matchedChecks.map((check) => ({
        kind: "ci" as const,
        summary: `${check.name}: ${check.conclusion ?? check.status}`,
        ...(check.htmlUrl ? { url: check.htmlUrl } : {})
      }))
    });
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

async function applyExactHeadPathStateEvidence(input: {
  repository: string;
  headSha: string;
  token?: string;
  result: RequirementResult;
}): Promise<RequirementResult> {
  if (input.result.status === "FAILED") return input.result;

  const intent = extractExplicitPathStateIntent(input.result.requirement.text);
  if (!intent) return input.result;

  try {
    const state = await inspectExactHeadPath({
      repository: input.repository,
      path: intent.path,
      headSha: input.headSha,
      ...(input.token ? { token: input.token } : {})
    });
    return assessExactHeadPathState(input.result.requirement, intent, state) ?? input.result;
  } catch {
    // Exact-head repository-state evidence is optional enrichment. If GitHub
    // cannot answer this extra path query unambiguously, preserve the existing
    // conservative assessment rather than manufacturing absence or failing an
    // otherwise usable verification report.
    return input.result;
  }
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
  const bodyRequirements = extractRequirements(issueBody);
  const shouldFetchIssueComments = shouldInspectIssueComments(issueBody)
    || shouldInspectSupportingComments(bodyRequirements);
  const issueComments = shouldFetchIssueComments
    ? await client.getIssueComments(input.repository, issueNumber)
    : [];
  const commentSources = issueComments.map((comment) => ({
    body: comment.body,
    authorAssociation: comment.author_association,
    ...(comment.html_url ? { htmlUrl: comment.html_url } : {})
  }));

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

  const commentRequirements = selectTrustedCommentRequirements(issueBody, commentSources);
  const requirements = commentRequirements.length > 0
    ? commentRequirements
    : bodyRequirements;
  const claims = extractCompletionClaims(pull.body ?? "");
  const changedFiles = files.map((file) => file.filename);
  const evidenceClaims = claims.map((claim) => ({
    ...claim,
    text: evidenceGateText(claim.text)
  }));
  const claimResults = buildClaimResults(evidenceClaims, checks, changedFiles)
    .map((result, index) => ({
      ...result,
      claim: claims[index] ?? result.claim
    }))
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
    .map(guardHistoricalClaim)
    .map(guardQuantifiedClaim)
    .map(guardPackagedRuntimeClaim)
    .map((result) => guardSpecializedValidationClaim(result, checks));
  const baseResults = requirements
    .map((requirement) => evaluateRequirement(requirement, files, checks, requiredCheckContexts))
    .map(guardHistoricalRequirement)
    .map(guardQuantifiedRequirement)
    .map(guardPackagedRuntimeRequirement)
    .map((result) => guardSpecializedValidationRequirement(result, checks));
  const exactHeadResults = await Promise.all(baseResults.map((result) =>
    applyExactHeadPathStateEvidence({
      repository: input.repository,
      headSha: pull.head.sha,
      ...(input.token ? { token: input.token } : {}),
      result
    })
  ));
  const results = exactHeadResults.map((result) => {
    if (result.status !== "UNPROVEN") return result;

    const supportingEvidence = selectTrustedSupportingCommentEvidence(
      result.requirement,
      input.prNumber,
      commentSources
    );
    if (supportingEvidence.length === 0) return result;

    return {
      ...result,
      reason: `${result.reason} Trusted maintainer comments tied to this PR are shown as supporting evidence only; they do not independently prove every clause.`,
      evidence: [...result.evidence, ...supportingEvidence]
    };
  });

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
