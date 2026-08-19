import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/npm-publish.yml", import.meta.url),
  "utf8"
);

describe("npm publish workflow", () => {
  it("publishes only after a successful Release workflow on main", () => {
    expect(workflow).toContain('workflow_run:\n    workflows: ["Release"]\n    types: [completed]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("WORKFLOW_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}");
    expect(workflow).not.toContain("release:\n    types: [published]");
  });

  it("verifies the exact package version from the public registry after publish", () => {
    expect(workflow).toContain("Verify published package from public registry");
    expect(workflow).toContain('npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}" version');
    expect(workflow).toContain('npx -y "${PACKAGE_NAME}@${PACKAGE_VERSION}" --version');
  });

  it("retries registry propagation before failing", () => {
    expect(workflow).toContain("for attempt in $(seq 1 20)");
    expect(workflow).toContain('sleep 6');
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
