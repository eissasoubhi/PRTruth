import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("Expected issue section headings", () => {
  it("extracts normative prose from a bare Expected heading", () => {
    const result = extractRequirements(`
## Context
The implementation may already exist before the target PR.

## Expected
Private attributes shadowing constructor parameters should keep the private attribute semantics intact.

## Additional notes
This section is not part of the requirement.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Private attributes shadowing constructor parameters should keep the private attribute semantics intact."
    ]);
  });
});
