import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function expectPinnedAction(content: string, action: string, version: string): void {
  const escapedAction = action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  expect(content).toMatch(
    new RegExp(`uses: ${escapedAction}@[0-9a-f]{40}\\s+#\\s+${escapedVersion}(?:\\s|$)`)
  );
  expect(content).not.toContain(`uses: ${action}@${version}`);
}

describe("workflow checkout hardening", () => {
  const immutableWorkflows = [
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ];

  for (const path of immutableWorkflows) {
    it(`${path} pins checkout v7 without persisting credentials`, () => {
      const content = workflow(path);

      expectPinnedAction(content, "actions/checkout", "v7");
      expect(content).not.toContain("uses: actions/checkout@v6");
      expect(content).toContain("persist-credentials: false");
    });
  }

  for (const path of [
    ".github/workflows/action-smoke.yml",
    ".github/workflows/dogfood.yml",
    ".github/workflows/github-rules-smoke.yml"
  ]) {
    it(`${path} uses checkout v7 without persisting credentials`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/checkout@v7");
      expect(content).not.toContain("uses: actions/checkout@v6");
      expect(content).toContain("persist-credentials: false");
    });
  }

  for (const path of immutableWorkflows) {
    it(`${path} pins setup-node v7 with implicit package-manager caching disabled`, () => {
      const content = workflow(path);

      expectPinnedAction(content, "actions/setup-node", "v7");
      expect(content).not.toContain("uses: actions/setup-node@v6");
      expect(content).toContain("package-manager-cache: false");
    });

    it(`${path} pins the Node 24-based pnpm action v6`, () => {
      const content = workflow(path);

      expectPinnedAction(content, "pnpm/action-setup", "v6");
      expect(content).not.toContain("uses: pnpm/action-setup@v4");
    });
  }

  for (const path of [
    ".github/workflows/dogfood.yml",
    ".github/workflows/github-rules-smoke.yml"
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
    it(`${path} pins github-script v9`, () => {
      const content = workflow(path);

      expectPinnedAction(content, "actions/github-script", "v9");
      expect(content).not.toContain("uses: actions/github-script@v7");
    });
  }

  it("pins github-script v9 in main merge provenance", () => {
    const content = workflow(".github/workflows/main-merge-provenance.yml");

    expectPinnedAction(content, "actions/github-script", "v9");
    expect(content).not.toContain("uses: actions/github-script@v7");
  });

  it("uses the current upload-artifact generation for dogfood reports", () => {
    const content = workflow(".github/workflows/dogfood.yml");

    expect(content).toContain("uses: actions/upload-artifact@v7");
    expect(content).not.toContain("uses: actions/upload-artifact@v4");
  });

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
    expect(content).toContain("permissions:\n      contents: write\n      actions: write");
    expect(content.match(/contents: write/g)).toHaveLength(1);
    expect(content.match(/actions: write/g)).toHaveLength(1);
  });

  it("self-heals npm publication after a release created with GITHUB_TOKEN", () => {
    const content = workflow(".github/workflows/release.yml");

    expect(content).toContain("Check whether released package version already exists on npm");
    expect(content).toContain("npm_exists: ${{ steps.npm.outputs.exists }}");
    expect(content).toContain("needs.validate.outputs.exists != 'true' || needs.validate.outputs.npm_exists != 'true'");
    expect(content).toContain("Dispatch npm publication");
    expect(content).toContain("github.rest.actions.createWorkflowDispatch");
    expect(content).toContain("workflow_id: 'npm-publish.yml'");
    expect(content).toContain("inputs: { tag }");
  });

  it("rejects manual release dispatches from branches other than main", () => {
    const content = workflow(".github/workflows/release.yml");

    expect(content).toContain("Validate manual release source");
    expect(content).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(content).toContain('if [[ "${GITHUB_REF}" != "refs/heads/main" ]]');
  });

  it("requires an automatic new release on main to come from exactly one merged PR", () => {
    const content = workflow(".github/workflows/release.yml");

    expect(content).toContain("Validate automatic release source");
    expect(content).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(content).toContain("steps.existing.outputs.exists != 'true'");
    expect(content).toContain("listPullRequestsAssociatedWithCommit");
    expect(content).toContain("pull.merged_at");
    expect(content).toContain("pull.base.ref === 'main'");
    expect(content).toContain("pull.merge_commit_sha === context.sha");
    expect(content).toContain("mergedIntoMain.length !== 1");
  });

  it("forces the dogfood package smoke to the public npm registry and cleans its temp directory", () => {
    const content = workflow(".github/workflows/dogfood.yml");

    expect(content).toContain("NPM_CONFIG_USERCONFIG: /dev/null");
    expect(content).toContain("NPM_CONFIG_REGISTRY: https://registry.npmjs.org");
    expect(content).toContain('TEMP_DIR="$(mktemp -d)"');
    expect(content).toContain("trap 'rm -rf \"${TEMP_DIR}\"' EXIT");
  });
});
