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
2. **PROVEN in source/tests** — a dedup/skip outcome renders as terminal `SKIPPED`, not `running`, with a focused regression test.
3. **PROVEN in source/tests** — a genuinely in-flight cycle still renders `running`, with focused regression coverage.
4. **PROVEN by durable maintainer lifecycle/runtime evidence** — issue comment `#issuecomment-5404795804` records that PR #65 was merged as `12c4c7c`, rolled out to the host, and live since 03:40 UTC. The same maintainer comment quotes the requested live skipped-duplicate row and a live partial-row fallback, and maps the relevant tests. This directly supplies the post-rollout witness requested by the acceptance criterion.

Current PRTruth extracts all four criteria but returns all four as `UNPROVEN`. For the first three, this reflects the existing limitation that source/tests are not generally promoted without structured execution evidence. The fourth is a more concrete false negative: trustworthy, durable issue-comment evidence exists for the exact rollout/live-observation requirement, but the verifier currently reads issue comments only when the issue body delegates acceptance-criteria definition to a trusted maintainer comment. It does not yet ingest post-delivery maintainer comments as evidence.

## Why this case matters

This case distinguishes two different comment roles that must not be conflated:

- comments that *define* or ratify acceptance criteria, which PRTruth already supports only behind explicit issue-body delegation and maintainer trust checks;
- comments that provide *post-delivery evidence* for an existing criterion, such as an exact merge, rollout timestamp, and quoted live observation.

A safe fix should not trust arbitrary prose from arbitrary commenters. It should require a trusted maintainer association, preserve the target-PR identity, and only promote evidence when the comment explicitly and durably records the lifecycle/runtime fact demanded by the requirement. Until that adapter exists, #276 remains a regression-first draft documenting the false negative.
