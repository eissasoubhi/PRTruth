import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("workflow checkout hardening", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/action-smoke.yml",
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ]) {
    it(`${path} does not persist checkout credentials`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/checkout@v4");
      expect(content).toContain("persist-credentials: false");
    });
  }

  it("keeps read-only workflows on contents: read", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      ".github/workflows/action-smoke.yml",
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

  it("publishes npm only after a successful Release workflow on main", () => {
    const content = workflow(".github/workflows/npm-publish.yml");

    expect(content).toContain('workflow_run:\n    workflows: ["Release"]\n    types: [completed]');
    expect(content).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(content).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(content).toContain("WORKFLOW_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}");
    expect(content).not.toContain("release:\n    types: [published]");
  });
});
