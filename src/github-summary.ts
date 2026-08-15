import { appendFile } from "node:fs/promises";

export async function writeGitHubStepSummary(
  markdown: string,
  summaryPath = process.env.GITHUB_STEP_SUMMARY
): Promise<boolean> {
  if (!summaryPath) return false;
  const content = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  await appendFile(summaryPath, content, "utf8");
  return true;
}
