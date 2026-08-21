import { describe, expect, it } from "vitest";
import { extractCompletionClaims } from "../src/claims.js";

describe("Evidence validation sections", () => {
  it("extracts executed validation results from an Evidence section", () => {
    const claims = extractCompletionClaims(`
## Evidence

- Cycle review found no new activity and the branch is merge-clean.
- \`pnpm lint\` — passed across all workspace packages.
- \`pnpm test\` — passed across all workspace packages.
- \`pnpm typecheck\` — passed across all workspace packages.
- \`pnpm build\` — passed across all workspace packages.
- CI Test and Container Smoke — green.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "`pnpm lint` — passed across all workspace packages.",
      "`pnpm test` — passed across all workspace packages.",
      "`pnpm typecheck` — passed across all workspace packages.",
      "`pnpm build` — passed across all workspace packages.",
      "CI Test and Container Smoke — green."
    ]);
  });

  it("does not promote non-validation evidence prose into completion claims", () => {
    const claims = extractCompletionClaims(`
## Evidence

- The changed service file contains the new retry branch.
- Reviewer notes are attached below.
- Tests are still running.
- Build did not pass.
`);

    expect(claims).toEqual([]);
  });

  it("stops Evidence extraction at the next unrelated heading", () => {
    const claims = extractCompletionClaims(`
## Evidence
- Tests passed.

## Risks
- Build passes only on my machine.
`);

    expect(claims.map((claim) => claim.text)).toEqual(["Tests passed."]);
  });
});
