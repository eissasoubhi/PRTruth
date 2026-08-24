import { describe, expect, it } from "vitest";
import {
  bindExecutedWorkflowStepsToSource,
  extractUniqueExecutableWorkflowSteps
} from "../src/workflow-source.js";

const workflowSource = `
name: CI
on: pull_request
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply migrations to a fresh database
        shell: bash
        run: npm run typeorm:run-migrations
      - name: Schema drift check
        run: |
          npm run typeorm:generate-migration -- --check
          echo "No schema drift"
`;

describe("workflow source provenance", () => {
  it("extracts an explicitly named executable run step", () => {
    const steps = extractUniqueExecutableWorkflowSteps(workflowSource);

    expect(steps).toEqual([
      {
        name: "Apply migrations to a fresh database",
        run: "npm run typeorm:run-migrations",
        shell: "bash"
      },
      {
        name: "Schema drift check",
        run: 'npm run typeorm:generate-migration -- --check\necho "No schema drift"'
      }
    ]);
  });

  it("omits duplicate step names because runtime binding would be ambiguous", () => {
    const steps = extractUniqueExecutableWorkflowSteps(`
jobs:
  one:
    steps:
      - name: Validate
        run: npm test
  two:
    steps:
      - name: validate
        run: npm run lint
`);

    expect(steps).toEqual([]);
  });

  it("ignores uses-only and unnamed run steps", () => {
    const steps = extractUniqueExecutableWorkflowSteps(`
jobs:
  verify:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - run: npm test
`);

    expect(steps).toEqual([]);
  });

  it("fails closed for malformed YAML", () => {
    expect(extractUniqueExecutableWorkflowSteps("jobs: [unterminated")).toEqual([]);
  });

  it("binds an observed exact-head step to its exact workflow source command", () => {
    expect(bindExecutedWorkflowStepsToSource({
      expectedHeadSha: "abc123",
      runHeadSha: "abc123",
      workflowPath: ".github/workflows/ci.yml",
      sourcePath: ".github/workflows/ci.yml",
      source: workflowSource,
      observedSteps: [
        {
          name: "Apply migrations to a fresh database",
          status: "completed",
          conclusion: "success"
        }
      ]
    })).toEqual([
      {
        name: "Apply migrations to a fresh database",
        run: "npm run typeorm:run-migrations",
        shell: "bash",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      }
    ]);
  });

  it("refuses workflow source from a different head or different path", () => {
    const base = {
      expectedHeadSha: "abc123",
      workflowPath: ".github/workflows/ci.yml",
      sourcePath: ".github/workflows/ci.yml",
      source: workflowSource,
      observedSteps: [{ name: "Schema drift check", status: "completed", conclusion: "success" }]
    };

    expect(bindExecutedWorkflowStepsToSource({ ...base, runHeadSha: "stale456" })).toEqual([]);
    expect(bindExecutedWorkflowStepsToSource({
      ...base,
      runHeadSha: "abc123",
      sourcePath: ".github/workflows/other.yml"
    })).toEqual([]);
  });

  it("refuses non-workflow paths and ambiguous runtime step names", () => {
    expect(bindExecutedWorkflowStepsToSource({
      expectedHeadSha: "abc123",
      runHeadSha: "abc123",
      workflowPath: "scripts/ci.yml",
      sourcePath: "scripts/ci.yml",
      source: workflowSource,
      observedSteps: [{ name: "Schema drift check", status: "completed", conclusion: "success" }]
    })).toEqual([]);

    expect(bindExecutedWorkflowStepsToSource({
      expectedHeadSha: "abc123",
      runHeadSha: "abc123",
      workflowPath: ".github/workflows/ci.yml",
      sourcePath: ".github/workflows/ci.yml",
      source: workflowSource,
      observedSteps: [
        { name: "Schema drift check", status: "completed", conclusion: "success" },
        { name: "schema drift check", status: "completed", conclusion: "failure" }
      ]
    })).toEqual([]);
  });
});
