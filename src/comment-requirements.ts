import { extractExplicitRequirements } from "./requirements.js";
import type { Evidence, Requirement } from "./types.js";

export interface IssueCommentRequirementsSource {
  body: string | null;
  authorAssociation: string;
  htmlUrl?: string;
}

const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const RATIFICATION_LANGUAGE = /\b(?:ratif(?:y|ied|ying)|adopt(?:ed|ing)?|supersed(?:e|es|ed|ing)|settling ruling|binding criteria|criteria bind)\b/i;
const BODY_DELEGATES_TO_COMMENT = /\bacceptance criteria\b[^.\n]{0,140}\b(?:maintainer|issue) comment\b|\bacceptance criteria\b[^.\n]{0,140}\bfollow(?:s|ing)?\b[^.\n]{0,80}\bcomment\b/i;
const POST_DELIVERY_LANGUAGE = /\b(?:merged|deployed|deployment|rolled\s+out|rollout|live|production|released|shipped|observed|verified)\b/i;
const LIFECYCLE_CONCEPTS = [
  /\btests?\b|\bsuite\b/i,
  /\bmerge(?:d)?\b/i,
  /\bdeploy(?:ed|ment)?\b|\broll(?:ed)?\s*out\b|\brollout\b/i,
  /\blive\b|\bproduction\b|\bruntime\b|\boccurrence\b|\bobserv(?:e|ed|ation)\b/i,
  /\breleas(?:e|ed)\b|\bship(?:ped)?\b/i
] as const;

function isTrustedAssociation(authorAssociation: string): boolean {
  return TRUSTED_ASSOCIATIONS.has(authorAssociation.toUpperCase());
}

function explicitlyReferencesPull(body: string, prNumber: number): boolean {
  const number = String(prNumber);
  return new RegExp(`\\b(?:pr|pull\\s+request)\\s*#?${number}\\b`, "i").test(body)
    || new RegExp(`/pull/${number}(?:\\b|[/?#])`, "i").test(body);
}

function sharesLifecycleConcept(requirement: string, comment: string): boolean {
  return LIFECYCLE_CONCEPTS.some((pattern) => pattern.test(requirement) && pattern.test(comment));
}

function commentSnippet(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

export function shouldInspectIssueComments(issueBody: string): boolean {
  return BODY_DELEGATES_TO_COMMENT.test(issueBody);
}

export function shouldInspectSupportingComments(requirements: Requirement[]): boolean {
  return requirements.some((requirement) =>
    LIFECYCLE_CONCEPTS.some((pattern) => pattern.test(requirement.text))
  );
}

export function selectTrustedCommentRequirements(
  issueBody: string,
  comments: IssueCommentRequirementsSource[]
): Requirement[] {
  if (!shouldInspectIssueComments(issueBody)) return [];

  let selected: Requirement[] = [];
  for (const comment of comments) {
    if (!isTrustedAssociation(comment.authorAssociation)) continue;

    const body = comment.body ?? "";
    if (!RATIFICATION_LANGUAGE.test(body)) continue;

    const requirements = extractExplicitRequirements(body);
    if (requirements.length > 0) selected = requirements;
  }

  return selected;
}

export function selectTrustedSupportingCommentEvidence(
  requirement: Requirement,
  prNumber: number,
  comments: IssueCommentRequirementsSource[]
): Evidence[] {
  if (!shouldInspectSupportingComments([requirement])) return [];

  const selected: Evidence[] = [];
  for (const comment of comments) {
    if (!isTrustedAssociation(comment.authorAssociation)) continue;

    const body = comment.body ?? "";
    if (!POST_DELIVERY_LANGUAGE.test(body)) continue;
    if (!explicitlyReferencesPull(body, prNumber)) continue;
    if (!sharesLifecycleConcept(requirement.text, body)) continue;

    selected.push({
      kind: "issue",
      summary: `Trusted maintainer comment tied to PR #${prNumber}: ${commentSnippet(body)}`,
      ...(comment.htmlUrl ? { url: comment.htmlUrl } : {})
    });
  }

  return selected.slice(-3);
}
