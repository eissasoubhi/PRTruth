import { describe, expect, it } from "vitest";
import {
  extractUniqueExecutableWorkflowSteps,
  successfulWorkflowCommandProvenance
} from "../src/workflow-source.js";

describe("workflow command failure sensitivity", () => {
  it("rejects run steps whose workflow explicitly allows failure", () => {
    const source = `
jobs:
  verify:
    steps:
      - name: Allowed failure
        continue-on-error: true
        run: npm test
      - name: Dynamic failure policy
        continue-on-error: \${{ matrix.experimental }}
        run: npm run lint
      - name: Strict validation
        continue-on-error: false
        run: npm run check
`;

    expect(extractUniqueExecutableWorkflowSteps(source)).toEqual([
      {
        name: "Strict validation",
        run: "npm run check"
      }
    ]);
  });

  it("does not treat commands that swallow failures as successful command provenance", () => {
    expect(successfulWorkflowCommandProvenance([
      {
        name: "Soft test",
        run: "npm test || true",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      },
      {
        name: "Strict test",
        run: "npm test && npm run lint",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      }
    ])).toEqual([
      {
        name: "Strict test",
        run: "npm test && npm run lint",
        workflowPath: ".github/workflows/ci.yml"
      }
    ]);
  });

  it("rejects unconditional success tails that can hide an earlier command failure", () => {
    expect(successfulWorkflowCommandProvenance([
      {
        name: "Semicolon true",
        run: "npm test; true",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      },
      {
        name: "Explicit zero exit",
        run: "npm test\nexit 0",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      },
      {
        name: "Colon success",
        run: "npm test\n:",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      }
    ])).toEqual([]);
  });

  it("rejects negated diagnostic conditionals that turn command failure into a green step", () => {
    expect(successfulWorkflowCommandProvenance([
      {
        name: "Diagnostic test",
        run: "if ! npm test; then\n  echo 'tests failed'\nfi",
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: "success"
      }
    ])).toEqual([]);
  });
});
