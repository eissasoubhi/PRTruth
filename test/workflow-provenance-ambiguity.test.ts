import { describe, expect, it } from "vitest";
import {
  bindExecutedWorkflowStepsToSource,
  extractUniqueExecutableWorkflowSteps
} from "../src/workflow-source.js";

describe("workflow provenance ambiguity", () => {
  it("fails closed when matrix-expanded runtime steps share one source step name", () => {
    const source = `
jobs:
  test:
    strategy:
      matrix:
        node: [20, 22]
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: npm test
`;

    expect(extractUniqueExecutableWorkflowSteps(source)).toEqual([
      { name: "Test", run: "npm test" }
    ]);

    expect(bindExecutedWorkflowStepsToSource({
      expectedHeadSha: "abc123",
      runHeadSha: "abc123",
      workflowPath: ".github/workflows/ci.yml",
      sourcePath: ".github/workflows/ci.yml",
      source,
      observedSteps: [
        { name: "Test", status: "completed", conclusion: "success" },
        { name: "Test", status: "completed", conclusion: "success" }
      ]
    })).toEqual([]);
  });

  it("does not invent command provenance for reusable-workflow jobs", () => {
    const source = `
jobs:
  delegated:
    uses: owner/repository/.github/workflows/reusable.yml@main
    with:
      target: production
`;

    expect(extractUniqueExecutableWorkflowSteps(source)).toEqual([]);

    expect(bindExecutedWorkflowStepsToSource({
      expectedHeadSha: "abc123",
      runHeadSha: "abc123",
      workflowPath: ".github/workflows/ci.yml",
      sourcePath: ".github/workflows/ci.yml",
      source,
      observedSteps: [
        { name: "Validate", status: "completed", conclusion: "success" }
      ]
    })).toEqual([]);
  });
});
