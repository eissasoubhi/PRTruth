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
4. **UNPROVEN as a single acceptance criterion** — the issue requires tests green, merged, rolled out, and the next live partial/skip occurrence quoted on the issue (or a synthetic fixture screenshot if none occurs naturally). The PR body reports 125 local tests passed and the PR is merged, but no exact-head GitHub Actions run is observable for the PR head and the public evidence inspected here does not independently prove rollout plus the requested post-rollout live occurrence/screenshot witness.

The human issue-level verdict is therefore not safely `PROVEN` from target-PR evidence alone. The implementation and focused regression behavior are strongly supported, while deployment/live-observation completion remains a separate runtime/lifecycle fact.

## Why this case matters

This case protects a useful evidence ceiling: source changes, focused tests, and merged state must not be widened into proof that a change was actually deployed and then observed in live operation.

A future runtime/deployment adapter could prove rollout only from a trustworthy deployment record tied to the exact code, and could prove the final live-occurrence clause only from a durable issue/comment/artifact witness. Until then, `UNPROVEN` is the conservative result for that combined criterion.
