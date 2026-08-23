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

  it("recognizes bold acceptance labels used by issue templates", () => {
    const result = extractRequirements(`
**Acceptance criteria:**
- [ ] Export endpoint exists
- [x] Tests cover authorization

**Contributor Checklist**
- [ ] Read CONTRIBUTING.md
`);

    expect(result.map((item) => item.text)).toEqual([
      "Export endpoint exists",
      "Tests cover authorization"
    ]);
    expect(result[1]?.checked).toBe(true);
  });

  it("does not mix contributor checklists into explicit acceptance criteria", () => {
    const result = extractRequirements(`
## Scope
- [ ] Resources restrict anonymous reads to published data
- [ ] Comments restrict anonymous reads to published resources

## Acceptance Criteria
- [ ] Anonymous users never receive drafts
- [ ] Owners can read their own drafts
- [ ] Admins can read everything
- [ ] Tests cover the access matrix

## Contributor Checklist
- [ ] Read CONTRIBUTING.md
- [ ] Discuss the approach before starting
- [ ] Keep changes focused
`);

    expect(result.map((item) => item.text)).toEqual([
      "Anonymous users never receive drafts",
      "Owners can read their own drafts",
      "Admins can read everything",
      "Tests cover the access matrix"
    ]);
  });

  it("prefers bold expected behavior prose over bold reproduction steps", () => {
    const result = extractRequirements(`
**To Reproduce**

1. Create a restricted role.
2. Start a whole-library export.
3. Observe that the operation is accepted.

**Expected behavior**

Whole-library transfers require unrestricted access for every content verb implied by the operation. Configuration-backup discovery requires the dedicated backup permission.

**Additional context**

The fix should exercise read, write, and delete restrictions independently.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Whole-library transfers require unrestricted access for every content verb implied by the operation. Configuration-backup discovery requires the dedicated backup permission."
    ]);
  });

  it("uses an explicit recommended-change section instead of compatibility and verification lists", () => {
    const result = extractRequirements(`
## Context
The existing batch path needs to match core behavior.

## Recommended change (one scope)
1. Apply per-size quality during batch conversion.
2. Skip gain-map HDR sources.
3. Honor image_editor_output_format consistently.

## Backward compatibility
- New helpers stay function_exists guarded.
- No settings-schema changes.

## Verification
- composer test: cover the new behavior.
- Manual: verify uploads on a release candidate host.
`);

    expect(result.map((item) => item.text)).toEqual([
      "Apply per-size quality during batch conversion.",
      "Skip gain-map HDR sources.",
      "Honor image_editor_output_format consistently."
    ]);
  });

  it("keeps acceptance criteria authoritative over a recommended-change section", () => {
    const result = extractRequirements(`
## Recommended change
1. Implement one possible approach.

## Acceptance criteria
- [ ] Observable behavior is correct.
`);

    expect(result.map((item) => item.text)).toEqual(["Observable behavior is correct."]);
  });

  it("keeps simple issue checklists when there is no acceptance heading", () => {
    const result = extractRequirements(`
## Tasks
- [ ] Add the endpoint
- [x] Add the migration

## Testing instructions
- [ ] Run the full suite locally
`);

    expect(result.map((item) => item.text)).toEqual([
      "Add the endpoint",
      "Add the migration"
    ]);
    expect(result[1]?.checked).toBe(true);
  });

  it("excludes issue-template initial-check and affected-component metadata", () => {
    const result = extractRequirements(`
### Initial Checks
- [x] I searched for similar requests
- [x] I read the documentation

### Description
The generated schema should include the annotated extra value type.

### Affected Components
- [ ] Data serialization
- [x] JSON Schema
- [ ] Dataclasses
`);

    expect(result).toEqual([]);
  });

  it("ignores list-like lines inside fenced code blocks", () => {
    const result = extractRequirements(`
Problem description.

\`\`\`diff
-    return os.path.samestat(p1.lstat(), p2.lstat())
+    s1, s2 = p1.lstat(), p2.lstat()
+    if not s1.st_ino or not s2.st_ino:
+        return False
\`\`\`
`);

    expect(result).toEqual([]);
  });

  it("does not treat pure reproduction steps as requirements", () => {
    const result = extractRequirements(`
**To Reproduce**
1. Open the dashboard.
2. Click the export button.
3. Observe the crash.

**Screenshots**
- See attached screenshot
`);

    expect(result).toEqual([]);
  });
});
