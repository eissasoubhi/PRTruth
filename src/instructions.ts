import type { GitHubClient, GitHubContentResponse } from "./github.js";
import type { RepositoryInstruction } from "./types.js";

const INSTRUCTION_PATHS = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CONTRIBUTING.md",
  ".github/copilot-instructions.md"
] as const;

const ROOT_INSTRUCTION_NAMES = new Set(INSTRUCTION_PATHS.filter((path) => !path.includes("/")));
const GITHUB_INSTRUCTION_NAME = "copilot-instructions.md";

function directoryEntries(value: unknown): GitHubContentResponse[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is GitHubContentResponse =>
    typeof entry === "object"
    && entry !== null
    && "path" in entry
    && "type" in entry
  );
}

function instructionFromEntry(entry: GitHubContentResponse): RepositoryInstruction | null {
  if (entry.type !== "file") return null;
  return {
    path: entry.path,
    ...(entry.html_url ? { htmlUrl: entry.html_url } : {})
  };
}

export async function discoverInstructionFiles(
  client: Pick<GitHubClient, "getContent">,
  repository: string
): Promise<RepositoryInstruction[]> {
  // Two directory listings replace five independent Contents API lookups.
  // This keeps instruction discovery exact while materially reducing GitHub API
  // fan-out when the real-project oracle corpus runs many verifications at once.
  const [rootResponse, githubResponse] = await Promise.all([
    client.getContent(repository, ""),
    client.getContent(repository, ".github")
  ]);

  const rootInstructions = directoryEntries(rootResponse)
    .filter((entry) => ROOT_INSTRUCTION_NAMES.has(entry.name as (typeof INSTRUCTION_PATHS)[number]))
    .map(instructionFromEntry)
    .filter((item): item is RepositoryInstruction => item !== null);

  const githubInstructions = directoryEntries(githubResponse)
    .filter((entry) => entry.name === GITHUB_INSTRUCTION_NAME)
    .map(instructionFromEntry)
    .filter((item): item is RepositoryInstruction => item !== null);

  const discovered = new Map<string, RepositoryInstruction>();
  for (const instruction of [...rootInstructions, ...githubInstructions]) {
    if (INSTRUCTION_PATHS.includes(instruction.path as (typeof INSTRUCTION_PATHS)[number])) {
      discovered.set(instruction.path, instruction);
    }
  }

  return INSTRUCTION_PATHS.flatMap((path) => {
    const instruction = discovered.get(path);
    return instruction ? [instruction] : [];
  });
}

export { INSTRUCTION_PATHS };
