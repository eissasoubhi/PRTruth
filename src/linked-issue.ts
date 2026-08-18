const CLOSING_ISSUE_PATTERN = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi;

export function extractClosingIssueNumbers(body: string): number[] {
  const numbers = new Set<number>();

  for (const match of body.matchAll(CLOSING_ISSUE_PATTERN)) {
    const parsed = Number.parseInt(match[1] ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      numbers.add(parsed);
    }
  }

  return [...numbers];
}

export function resolveIssueNumber(explicitIssue: number | undefined, pullBody: string): number {
  if (explicitIssue !== undefined) return explicitIssue;

  const linkedIssues = extractClosingIssueNumbers(pullBody);
  if (linkedIssues.length === 1) return linkedIssues[0]!;

  if (linkedIssues.length === 0) {
    throw new Error(
      "No issue was provided and the pull request body does not contain a closing reference such as `Fixes #123`. Pass --issue <number> or add one closing issue reference to the PR description."
    );
  }

  throw new Error(
    `The pull request closes multiple issues (${linkedIssues.map((issue) => `#${issue}`).join(", ")}). Pass --issue <number> to choose which issue PRTruth should verify.`
  );
}
