import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("acceptance section priority", () => {
  it("prefers a later explicit Acceptance Criteria section over a broad Requirements section", () => {
    const result = extractRequirements(`
## Requirements

### Detect origin
- Match a structured first line.
- Exit early for unrelated input.

### Run analysis
- Fetch external data using the configured integration.
- Generate a summary from that data.

## Acceptance Criteria
- [ ] Workflow triggers only on the intended event
- [ ] Workflow exits cleanly for unrelated input
- [ ] External data is fetched when the reference is present
- [ ] A single result comment is posted
- [ ] External fetch failure is handled gracefully
- [ ] No action is taken for unrelated input
`);

    expect(result.map((item) => item.text)).toEqual([
      "Workflow triggers only on the intended event",
      "Workflow exits cleanly for unrelated input",
      "External data is fetched when the reference is present",
      "A single result comment is posted",
      "External fetch failure is handled gracefully",
      "No action is taken for unrelated input"
    ]);
  });
});
