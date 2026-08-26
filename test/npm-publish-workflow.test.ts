import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/npm-publish.yml", import.meta.url),
  "utf8"
);

describe("npm publish workflow", () => {
  it("publishes automatically only from a published GitHub release", () => {
    expect(workflow).toContain("release:\n    types: [published]");
    expect(workflow).not.toContain('workflow_run:\n    workflows: ["Release"]');
    expect(workflow).toContain("REF=\"${{ github.event.release.tag_name }}\"");
    expect(workflow).toContain("TAG=\"${{ github.event.release.tag_name }}\"");
  });

  it("requires exact merged-main provenance for the published release tag", () => {
    expect(workflow).toContain("Validate published release provenance");
    expect(workflow).toContain("github.rest.repos.getCommit({ owner, repo, ref: tag })");
    expect(workflow).toContain("github.paginate(");
    expect(workflow).toContain("github.rest.repos.listPullRequestsAssociatedWithCommit");
    expect(workflow).toContain("pull.base.ref === 'main'");
    expect(workflow).toContain("pull.merge_commit_sha === commit.data.sha");
    expect(workflow).toContain("mergedIntoMain.length !== 1");
  });

  it("retains manual tag-based recovery", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain('REF="${{ inputs.tag }}"');
    expect(workflow).toContain('TAG="${{ inputs.tag }}"');
  });

  it("verifies the exact package version from the public registry after publish", () => {
    expect(workflow).toContain("Verify published package from public registry");
    expect(workflow).toContain('npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}" version');
    expect(workflow).toContain('npx -y "${PACKAGE_NAME}@${PACKAGE_VERSION}" --version');
  });

  it("retries registry propagation before failing", () => {
    expect(workflow).toContain("for attempt in $(seq 1 20)");
    expect(workflow).toContain("sleep 6");
    expect(workflow).toContain('[[ "${attempt}" -eq 20 ]]');
  });

  it("performs the consumer smoke without the publish token", () => {
    expect(workflow).toContain("NPM_CONFIG_USERCONFIG: /dev/null");
    expect(workflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");

    const verifySection = workflow.split("- name: Verify published package from public registry")[1] ?? "";
    expect(verifySection).not.toContain("NPM_TOKEN");
    expect(verifySection).not.toContain("NODE_AUTH_TOKEN");
  });
});
