import { describe, expect, it } from "vitest";
import { extractUniqueExecutableWorkflowSteps } from "../src/workflow-source.js";

describe("workflow source provenance", () => {
  it("extracts an explicitly named executable run step", () => {
    const steps = extractUniqueExecutableWorkflowSteps(`
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
`);

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
});
