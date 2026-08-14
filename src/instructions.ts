import type { GitHubClient } from "./github.js";
import type { RepositoryInstruction } from "./types.js";

const INSTRUCTION_PATHS = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CONTRIBUTING.md",
  ".github/copilot-instructions.md"
] as const;

export async function discoverInstructionFiles(
  client: Pick<GitHubClient, "getContent">,
  repository: string
): Promise<RepositoryInstruction[]> {
  const results = await Promise.all(
    INSTRUCTION_PATHS.map(async (path) => {
      const content = await client.getContent(repository, path);
      if (!content || content.type !== "file") return null;

      return {
        path: content.path,
        ...(content.html_url ? { htmlUrl: content.html_url } : {})
      } satisfies RepositoryInstruction;
    })
  );

  return results.filter((item): item is RepositoryInstruction => item !== null);
}

export { INSTRUCTION_PATHS };
