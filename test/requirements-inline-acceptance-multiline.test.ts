import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("multiline inline acceptance paragraph", () => {
  it("keeps wrapped continuation lines before splitting semicolon criteria", () => {
    const result = extractRequirements(`
**Acceptance.** A spot-check set of NCEP parameters resolves to the same
abbreviation, name, and units wgrib2 reports; a real GFS or HRRR file from
samples/ shows named parameters end to end; regeneration is byte-identical.

Roadmap: Tables / Next.
`);

    expect(result.map((item) => item.text)).toEqual([
      "A spot-check set of NCEP parameters resolves to the same abbreviation, name, and units wgrib2 reports",
      "a real GFS or HRRR file from samples/ shows named parameters end to end",
      "regeneration is byte-identical."
    ]);
  });
});
