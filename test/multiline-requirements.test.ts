import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("multiline acceptance criteria", () => {
  it("preserves indented continuation lines in checklist criteria", () => {
    const result = extractRequirements(`
## Acceptance Criteria

- [ ] \`ATTACH\`ing an existing file whose views were created in a known order
      (e.g. \`v1\`, \`v2\`, \`v3\`) lists them back in that same order from
      \`<alias>.sqlite_master\` after a fresh attach.
- [ ] \`make test-tcl-file FILE=e_dropview.test\` improves from the 31/48
      (64.6%) baseline recorded in the parent issue.
`);

    expect(result.map((item) => item.text)).toEqual([
      "`ATTACH`ing an existing file whose views were created in a known order (e.g. `v1`, `v2`, `v3`) lists them back in that same order from `<alias>.sqlite_master` after a fresh attach.",
      "`make test-tcl-file FILE=e_dropview.test` improves from the 31/48 (64.6%) baseline recorded in the parent issue."
    ]);
  });

  it("does not absorb an unrelated unindented paragraph into a list criterion", () => {
    const result = extractRequirements(`
## Acceptance Criteria
- [ ] Preserve the exact numeric baseline.

This paragraph explains context but is not part of the criterion.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Preserve the exact numeric baseline."
    ]);
  });
});
