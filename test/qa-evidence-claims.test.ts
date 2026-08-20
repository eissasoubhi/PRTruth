import { describe, expect, it } from "vitest";
import { extractCompletionClaims } from "../src/claims.js";

describe("QA evidence claim extraction", () => {
  it("extracts executed validation results from QA Evidence without promoting scenario prose", () => {
    const claims = extractCompletionClaims(`
## QA Evidence
- terminal missing-media behavior is exercised
- lint: pass
- tests: pass
- build passes
- coverage smoke is described here but has no executed success term

## Notes
- tests pass in prose outside the evidence section
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "lint: pass",
      "tests: pass",
      "build passes"
    ]);
    expect(claims.every((claim) => claim.source === "claim-section")).toBe(true);
  });

  it("accepts the expanded Quality Assurance Evidence heading", () => {
    const claims = extractCompletionClaims(`
## Quality Assurance Evidence
- unit tests passed
- typecheck succeeds
`);

    expect(claims.map((claim) => claim.text)).toEqual([
      "unit tests passed",
      "typecheck succeeds"
    ]);
  });
});
