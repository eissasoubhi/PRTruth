import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface SecurityStaticAnalysisEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const SECURITY_CONFIG_PATTERN = /(^|\/)(\.semgrep\.ya?ml|semgrep\.ya?ml|snyk\.ya?ml|\.snyk|codeql-config\.ya?ml|phpstan(\.neon(\.dist)?)?|psalm\.xml|bandit\.ya?ml|gosec\.json)$|(^|\/)\.github\/codeql\//i;

const SECURITY_STATIC_CHECK_PATTERN = /(codeql|semgrep|snyk|trivy|gosec|bandit|osv([\s:/_-]*scanner)?|dependency[\s:/_-]*review|npm[\s:/_-]*audit|pnpm[\s:/_-]*audit|yarn[\s:/_-]*audit|composer[\s:/_-]*audit|phpstan|psalm|static[\s:/_-]*analysis|security[\s:/_-]*(scan|analysis|check))/i;

function isSecurityConfig(path: string): boolean {
  return SECURITY_CONFIG_PATTERN.test(path);
}

function isSecurityStaticCheck(check: CheckRunSummary): boolean {
  return SECURITY_STATIC_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessSecurityStaticAnalysisEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): SecurityStaticAnalysisEvidenceResult {
  const signals = changedFiles
    .filter(isSecurityConfig)
    .map((path) => `security-config:${path}`);

  const matchedChecks = checks.filter(isSecurityStaticCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No security/static-analysis configuration or recognized CI check was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `Security/static-analysis evidence contains ${failed.length} failed recognized check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "Security/static-analysis configuration changed, but no recognizable security or static-analysis check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one recognized security/static-analysis check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized security/static-analysis check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
