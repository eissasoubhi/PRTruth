import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("extractRequirements", () => {
  it("extracts issue checklist items", () => {
    const result = extractRequirements(`
## Acceptance criteria
- [ ] Export endpoint exists
- [x] Admin authentication is required
`);

    expect(result.map((item) => item.text)).toEqual([
      "Export endpoint exists",
      "Admin authentication is required"
    ]);
    expect(result[1]?.checked).toBe(true);
  });

  it("extracts list items from an acceptance section", () => {
    const result = extractRequirements(`
## Context
Something else.

## Requirements
- Return CSV
- Limit exports to 10,000 rows

## Notes
- This should not become a requirement
`);

    expect(result.map((item) => item.text)).toEqual([
      "Return CSV",
      "Limit exports to 10,000 rows"
    ]);
  });
});
