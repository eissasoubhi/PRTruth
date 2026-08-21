import { describe, expect, it } from "vitest";
import { extractCompletionClaims } from "../src/claims.js";

describe("How did you test sections", () => {
  it("extracts executed validation results from How did you test this code", () => {
    const claims = extractCompletionClaims(`
## How did you test this code?

- Repository-wide mypy, focused ty, Ruff, \`bin/hogli lint:workflows\`, actionlint, and \`hogli ci:preflight --strict\` pass.
- The selected CI run collected 90 tests and passed.

## Docs update

None.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Repository-wide mypy, focused ty, Ruff, `bin/hogli lint:workflows`, actionlint, and `hogli ci:preflight --strict` pass.",
      "The selected CI run collected 90 tests and passed."
    ]);
  });

  it("accepts the common How did you test this change variant", () => {
    const claims = extractCompletionClaims(`
## How did you test this change?

- ESLint checks passed.
`);

    expect(claims).toEqual([
      {
        id: "claim-1",
        text: "ESLint checks passed.",
        source: "claim-section"
      }
    ]);
  });

  it("keeps scenario descriptions and explicitly unrun validation out", () => {
    const claims = extractCompletionClaims(`
## How did you test this code?

- Added tests for the selector fallback behavior.
- Not run: the full CI matrix and database-backed suites.
- Build passes.

## Automatic notifications

- [ ] Publish to changelog?
`);

    expect(claims.map((claim) => claim.text)).toEqual(["Build passes."]);
  });
});
