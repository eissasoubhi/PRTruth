import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const metadata = readFileSync(new URL("../action.yml", import.meta.url), "utf8");

describe("GitHub Action metadata", () => {
  it("uses the composite action runtime and Node 22", () => {
    expect(metadata).toContain("using: composite");
    expect(metadata).toContain("actions/setup-node@v4");
    expect(metadata).toContain("node-version: 22.12.0");
  });

  it("exposes the inputs needed for a practical review gate", () => {
    for (const input of [
      "issue:",
      "pr:",
      "repo:",
      "format:",
      "policy:",
      "comment:",
      "github_summary:",
      "token:"
    ]) {
      expect(metadata).toContain(input);
    }
  });

  it("passes policy and optional reporting controls to the released CLI", () => {
    expect(metadata).toContain('dist/cli.js" "${args[@]}"');
    expect(metadata).toContain('--issue "${{ inputs.issue }}"');
    expect(metadata).toContain('--pr "${{ inputs.pr }}"');
    expect(metadata).toContain('--policy "${{ inputs.policy }}"');
    expect(metadata).toContain("args+=(--github-summary)");
    expect(metadata).toContain("args+=(--comment)");
    expect(metadata).not.toContain("--output");
  });
});
