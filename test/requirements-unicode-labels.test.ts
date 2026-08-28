import { describe, expect, it } from "vitest";
import { extractRequirements } from "../src/requirements.js";

describe("unicode-labeled acceptance criteria", () => {
  it("keeps bold AC labels with em dashes authoritative over unrelated lists", () => {
    const result = extractRequirements(`
## Candidate mechanisms
- A second wall-clock read between fixture setup and assertion.
- Degenerate spacing near midnight.

## Acceptance Criteria

**AC1 — Deterministic reproduction before any fix.** Add a controlled boundary test.
[REQUIRED TEST] The new test FAILS on unmodified \`develop\` and PASSES after AC3's fix.

**AC2 — Record the diagnosis.** Explain why the prior guard did not prevent the failure.

**AC3 — Fix the root cause.** Use a single clock read.
[REQUIRED TEST] \`go test ./features/reports/provider/...\` passes.

**AC4 — The regression guard covers the real mechanism.** Extend the guard.
[REQUIRED TEST] The extended guard FAILS if AC3's fix is reverted, and PASSES with it.

**AC5 — Every fixture-sharing trend test holds at the boundary.** Verify all five callers.

## Files In Scope
- provider_test.go
- provider.go
`);

    expect(result).toHaveLength(5);
    expect(result.map((item) => item.text)).toEqual([
      expect.stringMatching(/^Deterministic reproduction before any fix\./),
      expect.stringMatching(/^Record the diagnosis\./),
      expect.stringMatching(/^Fix the root cause\./),
      expect.stringMatching(/^The regression guard covers the real mechanism\./),
      expect.stringMatching(/^Every fixture-sharing trend test holds at the boundary\./)
    ]);
    expect(result[0]?.text).toContain("FAILS on unmodified `develop` and PASSES after AC3's fix");
    expect(result[3]?.text).toContain("FAILS if AC3's fix is reverted, and PASSES with it");
  });

  it("normalizes plain labeled criteria that use an en dash", () => {
    const result = extractRequirements(`
## Acceptance Criteria
AC1 – First behavior must hold.
AC2 – Second behavior must hold.
`);

    expect(result.map((item) => item.text)).toEqual([
      "First behavior must hold.",
      "Second behavior must hold."
    ]);
  });
});
