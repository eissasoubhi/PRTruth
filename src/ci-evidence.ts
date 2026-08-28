import {
  assessGenericCiSuccess as assessGenericCiSuccessCore,
  isGenericCiSuccessStatement as isGenericCiSuccessStatementCore
} from "./ci-evidence-core.js";
import type { CheckRunSummary, RequiredStatusCheck } from "./types.js";

export type { CiEvidenceAssessment } from "./ci-evidence-core.js";

const EXPLICIT_GENERIC_CI_SUBJECT = /\b(?:ci|continuous integration|workflow|checks)\b/i;
const INSTRUCTIONAL_CHECK = /\bcheck\s+(?:the|a|an)\b/i;

export function isGenericCiSuccessStatement(text: string): boolean {
  if (!isGenericCiSuccessStatementCore(text)) return false;

  // An ordinary-language instruction such as "check the Network tab" is not
  // a whole-PR CI assertion. Only suppress this narrow imperative form; named
  // tool syntax such as `prettier --check`, `cargo check`, ESLint/Oxlint/Pyrefly
  // evidence, and explicit CI/workflow/plural-check claims keep existing behavior.
  if (INSTRUCTIONAL_CHECK.test(text) && !EXPLICIT_GENERIC_CI_SUBJECT.test(text)) {
    return false;
  }
  return true;
}

export function assessGenericCiSuccess(
  text: string,
  checks: CheckRunSummary[],
  requiredCheckContexts: RequiredStatusCheck[] | null = null
): ReturnType<typeof assessGenericCiSuccessCore> {
  if (!isGenericCiSuccessStatement(text)) return null;
  return assessGenericCiSuccessCore(text, checks, requiredCheckContexts);
}
