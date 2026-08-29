import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const metadata = readFileSync(new URL("../action.yml", import.meta.url), "utf8");

describe("GitHub Action metadata", () => {
  it("uses the composite action runtime and pins setup-node v7 immutably for Node 22", () => {
    expect(metadata).toContain("using: composite");
    expect(metadata).toMatch(/uses: actions\/setup-node@[0-9a-f]{40}\s+#\s+v7(?:\s|$)/);
    expect(metadata).not.toContain("uses: actions/setup-node@v7");
    expect(metadata).not.toContain("actions/setup-node@v6");
    expect(metadata).toContain("node-version: 22.12.0");
    expect(metadata).toContain("package-manager-cache: false");
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

  it("runs npx from a neutral temporary directory and cleans it up", () => {
    expect(metadata).toContain('TEMP_DIR="$(mktemp -d)"');
    expect(metadata).toContain('trap \'rm -rf "$TEMP_DIR"\' EXIT');
    expect(metadata).toContain('cd "$TEMP_DIR"');
  });

  it("uses the public unauthenticated npm registry and disables package scripts", () => {
    expect(metadata).toContain("NPM_CONFIG_USERCONFIG: /dev/null");
    expect(metadata).toContain("NPM_CONFIG_REGISTRY: https://registry.npmjs.org");
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
