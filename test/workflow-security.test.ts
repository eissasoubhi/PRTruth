import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("workflow checkout hardening", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/action-smoke.yml",
    ".github/workflows/dogfood.yml",
    ".github/workflows/github-rules-smoke.yml",
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ]) {
    it(`${path} uses checkout v7 without persisting credentials`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/checkout@v7");
      expect(content).not.toContain("uses: actions/checkout@v6");
      expect(content).toContain("persist-credentials: false");
    });
  }

  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/dogfood.yml",
    ".github/workflows/github-rules-smoke.yml",
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ]) {
    it(`${path} uses setup-node v7 with implicit package-manager caching disabled`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/setup-node@v7");
      expect(content).not.toContain("uses: actions/setup-node@v6");
      expect(content).toContain("package-manager-cache: false");
    });

    it(`${path} uses the Node 24-based pnpm action v6`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: pnpm/action-setup@v6");
      expect(content).not.toContain("uses: pnpm/action-setup@v4");
    });
  }

  for (const path of [
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ]) {
    it(`${path} uses github-script v9`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/github-script@v9");
      expect(content).not.toContain("uses: actions/github-script@v7");
    });
  }

  it("keeps read-only workflows on contents: read", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      ".github/workflows/action-smoke.yml",
      ".github/workflows/dogfood.yml",
      ".github/workflows/github-rules-smoke.yml",
      ".github/workflows/npm-publish.yml"
    ]) {
      expect(workflow(path)).toContain("permissions:\n  contents: read");
    }
  });

  it("keeps release validation read-only and scopes writes to the publishing job", () => {
    const content = workflow(".github/workflows/release.yml");

    expect(content).toContain("permissions:\n  contents: read");
    expect(content).toContain("publish:\n    name: create GitHub release");
    expect(content).toContain("permissions:\n      contents: write");
    expect(content.match(/contents: write/g)).toHaveLength(1);
  });

  it("rejects manual release dispatches from branches other than main", () => {
    const content = workflow(".github/workflows/release.yml");

    expect(content).toContain("Validate manual release source");
    expect(content).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(content).toContain('if [[ "${GITHUB_REF}" != "refs/heads/main" ]]');
  });

  it("forces the dogfood package smoke to the public npm registry and cleans its temp directory", () => {
    const content = workflow(".github/workflows/dogfood.yml");

    expect(content).toContain("NPM_CONFIG_USERCONFIG: /dev/null");
    expect(content).toContain("NPM_CONFIG_REGISTRY: https://registry.npmjs.org");
    expect(content).toContain('TEMP_DIR="$(mktemp -d)"');
    expect(content).toContain("trap 'rm -rf \"${TEMP_DIR}\"' EXIT");
  });
});
