import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("inline acceptance paragraphs", () => {
  it("extracts semicolon-delimited criteria from a bold inline acceptance label", () => {
    const result = extractRequirements(`
**Scope**
- Parse a pinned source file.
- Wire it into the runtime.

**Acceptance.** A spot-check set resolves to the same abbreviation, name, and units wgrib2 reports; a real GFS or HRRR file from samples/ shows named parameters end to end; regeneration is byte-identical.
`);

    expect(result.map((item) => item.text)).toEqual([
      "A spot-check set resolves to the same abbreviation, name, and units wgrib2 reports",
      "a real GFS or HRRR file from samples/ shows named parameters end to end",
      "regeneration is byte-identical."
    ]);
  });

  it("keeps a single inline acceptance sentence as one requirement", () => {
    const result = extractRequirements(`
**Acceptance criteria:** The generated schema remains backward compatible.
`);

    expect(result.map((item) => item.text)).toEqual([
      "The generated schema remains backward compatible."
    ]);
  });

  it("does not promote arbitrary bold prose labels", () => {
    const result = extractRequirements(`
**Context.** This paragraph; has semicolons; but is not acceptance criteria.
`);

    expect(result).toEqual([]);
  });
});
