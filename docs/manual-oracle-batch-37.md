# Manual Oracle Batch 37 — rollout and live-occurrence evidence

## Public case

- Repository: `ozand/eeebot-ops-dashboard`
- Issue: #59
- Pull request: #65
- Ecosystem: Python / operational dashboard / deployment lifecycle

## Independent oracle

Issue #59 defines four explicit acceptance criteria for partial-cycle explanations and dedup-skip status rendering. PR #65 was merged at exact head `b43498440d82e06f36c1820f6b056d49655b3ada`.

Independent inspection gives this factual assessment:

1. **PROVEN in source/tests** — a partial ledger row with a reason renders that reason; the patch adds focused coverage for the behavior.
2. **PROVEN in source/tests** — a dedup/skip outcome renders as terminal `SKIPPED`, not `running`, with focused regression coverage.
3. **PROVEN in source/tests** — a genuinely in-flight cycle still renders `running`, with focused regression coverage.
4. **UNPROVEN as a composite requirement** — a trusted OWNER comment records that PR #65 was merged as `12c4c7c`, rolled out to the host, live since 03:40 UTC, and quotes the requested live skipped/partial rows. That is strong durable evidence for the merge/rollout/live-observation portions. However, the same criterion also requires `Tests green`. The repository exposes no exact-head GitHub Actions run for PR head `b4349844…`; the only test-execution evidence is maintainer-authored prose (`Suite: 125 passed`) in the PR/comment. PRTruth should not promote a composite requirement to `PROVEN` from self-reported prose when authoritative execution evidence for one clause is missing.

Current PRTruth extracts all four criteria and returns all four as `UNPROVEN`. The first three remain conservative because source/test semantics are not generally promoted without a deterministic adapter. The fourth is also conservatively correct under the current evidence standard: the live rollout witness is credible and useful, but it does not independently prove every clause of the composite acceptance criterion.

## Why this case matters

This case separates three evidence roles that must not be conflated:

- comments that *define* or ratify acceptance criteria, which PRTruth already supports only behind explicit issue-body delegation and maintainer trust checks;
- trusted maintainer comments that provide durable post-delivery rollout/runtime attestations;
- authoritative execution evidence such as exact-head CI logs/checks.

A future comment-evidence adapter may safely retain trusted rollout/runtime attestations as supporting evidence, but it must not turn them into a generic proof channel for unrelated clauses such as test execution. Batch 37 therefore locks in the fail-closed result: trusted maintainer prose alone must not over-prove this composite lifecycle requirement.
