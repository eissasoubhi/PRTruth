export const PRE_FIX_FAILURE_UNPROVEN_REASON =
  "Current-head green CI cannot prove that a regression test failed against the pre-fix implementation.";

/**
 * Detect requirements whose truth depends on observing the candidate test
 * against an earlier/pre-fix revision. Current-head CI can prove the test is
 * green now, but it cannot prove this historical red-first condition.
 *
 * Keep this intentionally narrow: ordinary regression-test requirements and
 * generic "tests pass" claims must remain eligible for normal CI evidence.
 */
export function requiresPreFixFailureEvidence(text: string): boolean {
  return /\bred[- ]first\b/i.test(text)
    || /\b(?:fail(?:s|ed|ing)?|red)\b[^.\n]{0,50}\b(?:before|prior to)\b[^.\n]{0,30}\b(?:the\s+)?fix\b/i.test(text)
    || /\b(?:fail(?:s|ed|ing)?|red)\b[^.\n]{0,50}\b(?:on|against)\b[^.\n]{0,30}\b(?:pre[- ]fix|old|previous)\b[^.\n]{0,20}\b(?:code|implementation|version|revision)?\b/i.test(text);
}
