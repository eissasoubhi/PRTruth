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

  it("extracts bullets from explicit completion, included, and validation sections", () => {
    const claims = extractCompletionClaims(`
## Summary
- This is context, not a completion claim

## Included
- Added workspace onboarding

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
      "Added workspace onboarding",
      "Added CSV export",
      "Added admin authorization",
      "Unit tests pass",
      "Typecheck passes"
    ]);
  });

  it("captures high-confidence validation prose used by real project pull requests", () => {
    const claims = extractCompletionClaims(`
## Validation

Self-hosted Linux ARM64 CI passes install, lint, typecheck, tests and production build.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Self-hosted Linux ARM64 CI passes install, lint, typecheck, tests and production build."
    ]);
  });

  it("returns no claims for prose without explicit claim structure", () => {
    expect(extractCompletionClaims("This PR probably fixes the bug.")).toEqual([]);
  });
});
