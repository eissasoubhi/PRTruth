import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("explicit acceptance-test sections", () => {
  it("keeps an explicit acceptance test alongside checkbox acceptance criteria", () => {
    const result = extractRequirements(`
## Acceptance criteria
- [ ] Message, Mention, and optional Welcome handlers can be provisioned from a fresh bot.
- [ ] Provisioning is idempotent and supports read-only dry-run.

## Franzi acceptance test

First run inspection/dry-run only against Franzi and compare the existing Message/Mention handlers. Do not replace working production handler code without separate approval. If no change is needed, record the read-back verification as acceptance evidence. Any mutation test should use an isolated test bot where possible.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Message, Mention, and optional Welcome handlers can be provisioned from a fresh bot.",
      "Provisioning is idempotent and supports read-only dry-run.",
      "First run inspection/dry-run only against Franzi and compare the existing Message/Mention handlers. Do not replace working production handler code without separate approval. If no change is needed, record the read-back verification as acceptance evidence. Any mutation test should use an isolated test bot where possible."
    ]);
  });

  it("does not treat generic testing instructions as an acceptance-test requirement", () => {
    const result = extractRequirements(`
## Acceptance criteria
- [ ] The build passes.

## Testing instructions
Run the application locally and inspect the page.
`);

    expect(result.map((item) => item.text)).toEqual(["The build passes."]);
  });
});
