import { describe, expect, it } from "vitest";
import { extractCompletionClaims } from "../src/claims.js";

describe("extractCompletionClaims", () => {
  it("extracts checked checklist items anywhere in the pull request body", () => {
    const claims = extractCompletionClaims(`
## Checklist
- [x] Tests pass
- [ ] Documentation updated
- [X] No breaking API changes
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Tests pass",
      "No breaking API changes"
    ]);
    expect(claims.every((claim) => claim.source === "checked-checklist")).toBe(true);
  });

  it("extracts bullets from explicit completion and validation sections only", () => {
    const claims = extractCompletionClaims(`
## Summary
- This is context, not a completion claim

## What changed
- Added CSV export
- Added admin authorization

## Validation
1. Unit tests pass
2. Typecheck passes

## Notes
- This should not be extracted
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Added CSV export",
      "Added admin authorization",
      "Unit tests pass",
      "Typecheck passes"
    ]);
  });

  it("returns no claims for prose without explicit claim structure", () => {
    expect(extractCompletionClaims("This PR probably fixes the bug.")).toEqual([]);
  });
});
