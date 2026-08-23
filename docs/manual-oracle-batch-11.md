# Manual oracle batch 11 — documentation/skill standards

Public case: `bgutschke/skills` issue #35 / PR #45.

## Why this case

This case stresses requirement extraction and conservative evidence semantics on a documentation-heavy change with a large explicit acceptance set rather than a conventional application-code feature.

The issue contains 22 explicit acceptance criteria covering a maintainer-only skill definition, source-list and orchestration constraints, a topic-organized best-practices document, migration out of `CODING_STANDARDS.md`, two real invocations demonstrating idempotency, and an ADR.

The target PR head is `0c49f0efb75d8e29789f18f4b3e8f5d93f329125`. Its exact pull-request workflow `Validate` completed successfully. The `validate` job includes successful executable steps for tests, Markdown lint, commit-message lint, and plugin-manifest validation.

## Independent human oracle

The PR diff directly contains the new `.claude/skills/skill-writing-standards/SKILL.md`, the best-practices document, the requested `CODING_STANDARDS.md` migration, ADR material, and the `.gitignore` adjustment needed to track the maintainer-only skill. The PR description also records two real runs of the skill and explains the second no-op run used to demonstrate idempotency.

At the target head, the implementation is strongly consistent with the issue's acceptance set. However, several criteria describe historical/process facts — for example that the skill was actually run twice and that sub-agents behaved in a particular way — which cannot be proven merely from file diffs or from generic green CI. A conservative verifier should therefore avoid promoting the full issue to `PROVEN` unless those facts are observable through a deterministic evidence channel.

The exact-head `Validate` workflow is useful evidence for the claims that repository tests, Markdown lint, and plugin validation pass. It is not evidence that every prose/process acceptance criterion is true.

## Regression objective

The executable workflow asserts that PRTruth extracts exactly the 22 authoritative acceptance criteria and retains representative high-signal requirements from across the set. It deliberately does not assert that all 22 become `PROVEN`.

This protects two boundaries:

1. dense explicit acceptance sections must not lose or invent requirements;
2. broad green repository validation must not automatically prove historical/process claims that were not observed.

No special-case proof rule is introduced for this repository, Claude skills, documentation files, or PR-description assertions.
