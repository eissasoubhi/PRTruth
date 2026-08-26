import { describe, expect, it, vi } from "vitest";
import { discoverInstructionFiles, INSTRUCTION_PATHS } from "../src/instructions.js";
import type { GitHubClient, GitHubContentResponse } from "../src/github.js";

function directory(entries: GitHubContentResponse[]): GitHubContentResponse {
  return entries as unknown as GitHubContentResponse;
}

describe("discoverInstructionFiles", () => {
  it("discovers supported instruction files with two directory lookups", async () => {
    const getContent = vi.fn(async (_repository: string, path: string) => {
      if (path === "") {
        return directory([
          { name: "AGENTS.md", path: "AGENTS.md", type: "file", html_url: "https://example.test/agents" },
          { name: "CLAUDE.md", path: "CLAUDE.md", type: "file" },
          { name: "README.md", path: "README.md", type: "file" },
          { name: "CONTRIBUTING.md", path: "CONTRIBUTING.md", type: "file" }
        ]);
      }
      if (path === ".github") {
        return directory([
          { name: "copilot-instructions.md", path: ".github/copilot-instructions.md", type: "file" },
          { name: "workflows", path: ".github/workflows", type: "dir" }
        ]);
      }
      throw new Error(`Unexpected path lookup: ${path}`);
    });

    const instructions = await discoverInstructionFiles(
      { getContent } as unknown as Pick<GitHubClient, "getContent">,
      "owner/repository"
    );

    expect(getContent).toHaveBeenCalledTimes(2);
    expect(getContent).toHaveBeenCalledWith("owner/repository", "");
    expect(getContent).toHaveBeenCalledWith("owner/repository", ".github");
    expect(instructions.map((instruction) => instruction.path)).toEqual([
      "AGENTS.md",
      "CLAUDE.md",
      "CONTRIBUTING.md",
      ".github/copilot-instructions.md"
    ]);
    expect(instructions[0]?.htmlUrl).toBe("https://example.test/agents");
  });

  it("fails closed when directory responses are not listings", async () => {
    const getContent = vi.fn(async () => ({
      name: "AGENTS.md",
      path: "AGENTS.md",
      type: "file"
    } satisfies GitHubContentResponse));

    const instructions = await discoverInstructionFiles(
      { getContent } as unknown as Pick<GitHubClient, "getContent">,
      "owner/repository"
    );

    expect(instructions).toEqual([]);
    expect(getContent).toHaveBeenCalledTimes(2);
  });

  it("keeps the supported instruction path contract unchanged", () => {
    expect(INSTRUCTION_PATHS).toEqual([
      "AGENTS.md",
      "CLAUDE.md",
      "GEMINI.md",
      "CONTRIBUTING.md",
      ".github/copilot-instructions.md"
    ]);
  });
});
