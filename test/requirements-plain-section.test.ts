import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("plain-text issue section labels", () => {
  it("prefers a plain Acceptance criteria label over a preceding expected-change list", () => {
    const result = extractRequirements(`
Expected change:
- Create exactly one validation file.
- Put two exact lines in it.
- Do not change anything else.

Acceptance criteria:
- Work starts from an exact-SHA fork base.
- Promotion creates a one-commit draft PR.
- The promoted title is normalized.
- The generated description prefix appears exactly once.
- External-fork CI routing is used.

This issue is disposable after validation.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Work starts from an exact-SHA fork base.",
      "Promotion creates a one-commit draft PR.",
      "The promoted title is normalized.",
      "The generated description prefix appears exactly once.",
      "External-fork CI routing is used."
    ]);
  });

  it("does not reinterpret arbitrary colon-ended prose as a section heading", () => {
    const result = extractRequirements(`
Context:
- This remains a normal fallback requirement because Context is not a recognized section label.
`);

    expect(result.map((item) => item.text)).toEqual([
      "This remains a normal fallback requirement because Context is not a recognized section label."
    ]);
  });
});
