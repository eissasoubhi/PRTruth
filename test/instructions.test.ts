import { describe, expect, it } from "vitest";
import { discoverInstructionFiles } from "../src/instructions.js";

function fakeClient(existing: Record<string, { path: string; html_url?: string }>) {
  return {
    async getContent(_repository: string, path: string) {
      const content = existing[path];
      if (!content) return null;
      return {
        name: content.path.split("/").at(-1) ?? content.path,
        path: content.path,
        type: "file",
        ...(content.html_url ? { html_url: content.html_url } : {})
      };
    }
  };
}

describe("discoverInstructionFiles", () => {
  it("finds known repository instruction files without requiring configuration", async () => {
    const client = fakeClient({
      "AGENTS.md": { path: "AGENTS.md", html_url: "https://example.test/AGENTS.md" },
      "CONTRIBUTING.md": { path: "CONTRIBUTING.md" }
    });

    const instructions = await discoverInstructionFiles(client, "acme/widget");

    expect(instructions).toEqual([
      { path: "AGENTS.md", htmlUrl: "https://example.test/AGENTS.md" },
      { path: "CONTRIBUTING.md" }
    ]);
  });
});
