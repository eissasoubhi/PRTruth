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

  it("does not turn validation failure reports into completion claims", () => {
    const claims = extractCompletionClaims(`
## Validation
- Backend tests failed because the fixture service was unavailable.
- Build failure is tracked separately.
Typecheck failed on the self-hosted runner.
- Frontend tests pass.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Frontend tests pass."
    ]);
  });

  it("does not turn mixed success and failure reports into completion claims", () => {
    const claims = extractCompletionClaims(`
## Validation
- Tests passed before the dependency update, but the current build failed.
- CI was green yesterday; frontend tests are failing now.
- Lint passes on the current head.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Lint passes on the current head."
    ]);
  });

  it("does not turn negated validation success language into completion claims", () => {
    const claims = extractCompletionClaims(`
## Validation
- Backend tests did not pass on ARM64.
- Typecheck does not succeed in the clean container.
- Build never completed on the self-hosted runner.
- Frontend tests pass.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Frontend tests pass."
    ]);
  });

  it("rejects progressive failures and common contracted negations", () => {
    const claims = extractCompletionClaims(`
## Validation
- [x] Backend tests are failing on ARM64.
- Frontend tests aren't passing in Chromium.
- Typecheck hasn't succeeded in the clean container.
- Build can't complete on the self-hosted runner.
- Lint is passing.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Lint is passing."
    ]);
  });

  it("rejects skipped, pending, and not-run validation reports", () => {
    const claims = extractCompletionClaims(`
## Validation
- [x] Backend tests were not run on ARM64.
- Frontend tests weren't executed in Chromium.
- Typecheck was skipped because this is docs-only.
- Build pending on the self-hosted runner.
- Lint passes.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Lint passes."
    ]);
  });

  it("rejects queued, cancelled, timed-out, blocked, and running validation states", () => {
    const claims = extractCompletionClaims(`
## Validation
- [x] Backend tests queued on ARM64.
- Frontend tests cancelled after the runner disconnected.
- Typecheck timed out in the clean container.
- Build blocked on an unavailable dependency.
- CI in progress on the current head.
- Lint running on the self-hosted runner.
- Unit tests pass.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Unit tests pass."
    ]);
  });

  it("rejects degraded and incomplete validation success reports", () => {
    const claims = extractCompletionClaims(`
## Validation
- [x] CI is flaky on the current head.
- Build is unstable on ARM64.
- Typecheck result is inconclusive.
- Tests partially pass.
- Most tests pass.
- Tests pass except on Windows.
- Lint passes.
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "Lint passes."
    ]);
  });

  it("returns no claims for prose without explicit claim structure", () => {
    expect(extractCompletionClaims("This PR probably fixes the bug.")).toEqual([]);
  });
});
