import {
  assessGenericCiSuccess as assessGenericCiSuccessCore,
  isGenericCiSuccessStatement as isGenericCiSuccessStatementCore
} from "./ci-evidence-core.js";
import type { CheckRunSummary, RequiredStatusCheck } from "./types.js";

export type { CiEvidenceAssessment } from "./ci-evidence-core.js";

const EXPLICIT_GENERIC_CI_SUBJECT = /\b(?:ci|continuous integration|workflow|checks)\b/i;
const STANDALONE_CHECK = /\bcheck\b/i;
const TOOL_CHECK = /\b(?:ty\s+check|cargo\s+check|git\s+diff\s+--check|check[- ]jsonschema|trunk\s+check)\b/i;

export function isGenericCiSuccessStatement(text: string): boolean {
  if (!isGenericCiSuccessStatementCore(text)) return false;

  // A singular ordinary-language instruction such as "check the Network tab"
  // is not a whole-PR CI assertion. Keep explicit CI/workflow/plural-check claims
  // and named validation tools intact while rejecting that ambiguous singular
  // "check" path before unrelated CI can decide a domain requirement.
  if (!STANDALONE_CHECK.test(text)) return true;
  return EXPLICIT_GENERIC_CI_SUBJECT.test(text) || TOOL_CHECK.test(text);
}

export function assessGenericCiSuccess(
  text: string,
  checks: CheckRunSummary[],
  requiredCheckContexts: RequiredStatusCheck[] | null = null
): ReturnType<typeof assessGenericCiSuccessCore> {
  if (!isGenericCiSuccessStatement(text)) return null;
  return assessGenericCiSuccessCore(text, checks, requiredCheckContexts);
}
