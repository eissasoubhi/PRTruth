import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const metadata = readFileSync(new URL("../action.yml", import.meta.url), "utf8");

describe("GitHub Action metadata", () => {
  it("uses the composite action runtime and Node 22", () => {
    expect(metadata).toContain("using: composite");
    expect(metadata).toContain("actions/setup-node@v4");
    expect(metadata).toContain("node-version: 22.12.0");
  });

  it("exposes issue, PR, repository, format, and token inputs", () => {
    for (const input of ["issue:", "pr:", "repo:", "format:", "token:"]) {
      expect(metadata).toContain(input);
    }
  });

  it("runs the PRTruth verify command without depending on unreleased CLI flags", () => {
    expect(metadata).toContain("dist/cli.js\" verify");
    expect(metadata).toContain('--issue "${{ inputs.issue }}"');
    expect(metadata).toContain('--pr "${{ inputs.pr }}"');
    expect(metadata).not.toContain("--output");
  });
});
