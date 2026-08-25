import type { ExactHeadPathState } from "./exact-head-file.js";
import type { Evidence, Requirement, RequirementResult } from "./types.js";

export interface ExplicitPathStateIntent {
  path: string;
  expected: "absent";
}

function looksLikeRepositoryPath(value: string): boolean {
  return value.length > 0
    && !value.startsWith("/")
    && !value.endsWith("/")
    && !value.includes(" ")
    && !value.includes("..")
    && (value.includes("/") || /\.[a-z0-9_-]+$/i.test(value));
}

export function extractExplicitPathStateIntent(text: string): ExplicitPathStateIntent | null {
  if (!/\b(?:remove|removed|delete|deleted|drop|dropped|no longer exists?|must not exist|absent)\b/i.test(text)) {
    return null;
  }

  const paths = [...text.matchAll(/`([^`\n]+)`/g)]
    .map((match) => match[1] ?? "")
    .filter(looksLikeRepositoryPath);

  if (paths.length !== 1) return null;
  return { path: paths[0]!, expected: "absent" };
}

export function assessExactHeadPathState(
  requirement: Requirement,
  intent: ExplicitPathStateIntent,
  state: ExactHeadPathState
): RequirementResult | null {
  if (state.path !== intent.path) return null;

  const evidence: Evidence[] = [{
    kind: "repository",
    summary: state.state === "absent"
      ? `Exact PR head does not contain ${intent.path}`
      : `Exact PR head still contains ${intent.path}`,
    ...(state.state === "present" && state.htmlUrl ? { url: state.htmlUrl } : {})
  }];

  if (state.state === "absent") {
    return {
      requirement,
      status: "PROVEN",
      reason: "The requirement explicitly names one repository path to remove, and that path is absent at the exact pull-request head.",
      evidence
    };
  }

  return {
    requirement,
    status: "FAILED",
    reason: "The requirement explicitly names one repository path to remove, but that path is still present at the exact pull-request head.",
    evidence
  };
}
