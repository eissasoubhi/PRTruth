import { extractExplicitRequirements } from "./requirements.js";
import type { Requirement } from "./types.js";

export interface IssueCommentRequirementsSource {
  body: string | null;
  authorAssociation: string;
}

const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const RATIFICATION_LANGUAGE = /\b(?:ratif(?:y|ied|ying)|adopt(?:ed|ing)?|supersed(?:e|es|ed|ing)|settling ruling|binding criteria|criteria bind)\b/i;
const BODY_DELEGATES_TO_COMMENT = /\bacceptance criteria\b[^.\n]{0,140}\b(?:maintainer|issue) comment\b|\bacceptance criteria\b[^.\n]{0,140}\bfollow(?:s|ing)?\b[^.\n]{0,80}\bcomment\b/i;

export function shouldInspectIssueComments(issueBody: string): boolean {
  return BODY_DELEGATES_TO_COMMENT.test(issueBody);
}

export function selectTrustedCommentRequirements(
  issueBody: string,
  comments: IssueCommentRequirementsSource[]
): Requirement[] {
  if (!shouldInspectIssueComments(issueBody)) return [];

  let selected: Requirement[] = [];
  for (const comment of comments) {
    if (!TRUSTED_ASSOCIATIONS.has(comment.authorAssociation.toUpperCase())) continue;

    const body = comment.body ?? "";
    if (!RATIFICATION_LANGUAGE.test(body)) continue;

    const requirements = extractExplicitRequirements(body);
    if (requirements.length > 0) selected = requirements;
  }

  return selected;
}
