import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowPath = new URL("../.github/workflows/main-merge-provenance.yml", import.meta.url);
const workflowText = readFileSync(workflowPath, "utf8");
const workflow = parse(workflowText) as Record<string, unknown>;

describe("main merge provenance workflow", () => {
  it("runs only for pushes to main with read-only repository permissions", () => {
    const trigger = workflow.on as { push?: { branches?: string[] } };
    expect(trigger.push?.branches).toEqual(["main"]);
    expect(workflow.permissions).toEqual({
      contents: "read",
      "pull-requests": "read"
    });
  });

  it("requires the current main SHA to be the merge commit of exactly one merged PR", () => {
    expect(workflowText).toContain("listPullRequestsAssociatedWithCommit");
    expect(workflowText).toContain("pull.base.ref === 'main'");
    expect(workflowText).toContain("pull.merge_commit_sha === context.sha");
    expect(workflowText).toContain("mergedIntoMain.length !== 1");
  });
});
