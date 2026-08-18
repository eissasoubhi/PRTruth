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

  it("allows the issue input to be omitted for linked-issue inference", () => {
    expect(metadata).toContain("PRTRUTH_ISSUE: ${{ inputs.issue }}");
    expect(metadata).toContain('if [[ -n "$PRTRUTH_ISSUE" ]]');
    expect(metadata).toContain('args+=(--issue "$PRTRUTH_ISSUE")');
  });

  it("executes the exact package version published for the Action tag", () => {
    expect(metadata).toContain(
      "require(process.env.GITHUB_ACTION_PATH + '/package.json').version"
    );
    expect(metadata).toContain('npx -y "prtruth@${PRTRUTH_VERSION}" "${args[@]}"');
    expect(metadata).not.toContain("npm install --ignore-scripts");
    expect(metadata).not.toContain("npm run build");
    expect(metadata).not.toContain("dist/cli.js");
  });

  it("runs npx from a neutral temporary directory", () => {
    expect(metadata).toContain('TEMP_DIR="$(mktemp -d)"');
    expect(metadata).toContain('cd "$TEMP_DIR"');
  });

  it("uses unauthenticated npm configuration and disables package scripts", () => {
    expect(metadata).toContain("NPM_CONFIG_USERCONFIG: /dev/null");
    expect(metadata).toContain('NPM_CONFIG_IGNORE_SCRIPTS: "true"');
  });

  it("passes policy and optional reporting controls to the released CLI", () => {
    expect(metadata).toContain('--pr "$PRTRUTH_PR"');
    expect(metadata).toContain('--policy "$PRTRUTH_POLICY"');
    expect(metadata).toContain("args+=(--github-summary)");
    expect(metadata).toContain("args+=(--comment)");
    expect(metadata).not.toContain("--output");
  });
});
