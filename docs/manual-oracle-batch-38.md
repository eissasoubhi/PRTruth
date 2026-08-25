# Manual Oracle Batch 38 — accepted scope deviation vs original acceptance criteria

## Public case

- Repository: `wisecom-oy/atlas`
- Issue: #180
- Pull request: #183
- Ecosystem: TypeScript / SDK cancellation / backup lifecycle

## Independent oracle

Issue #180 defines four explicit acceptance criteria for exposing hard-stop semantics through the SDK. PR #183 was merged at exact head `7b92211b51deddc62976e827d9d6bd31b1ee4b14`, and exact-head GitHub Actions CI completed successfully with build, typecheck, lint, format and coverage-backed test execution.

Independent inspection gives this factual assessment against the original issue text:

1. **PROVEN** — the SDK now exposes a hard-stop signal distinct from graceful cancellation for Outlook backup. `hardStopSignal` maps to `should_force_stop`, while the existing `signal` continues to map to graceful interruption.
2. **FAILED as written** — the issue requires the exposed option to reach Outlook, OneDrive and SharePoint. PR #183 explicitly states that drives are not covered and documents why the missing capability belongs to the underlying services. This is a deliberate scope deviation, not factual satisfaction of the original criterion.
3. **FAILED as written** — the issue requires a test asserting runtime stop semantics: hard stop ends the run without finishing the current unit, while graceful stop still persists the delta link. The added tests verify option adaptation and independence of the two signals, but they do not execute the underlying backup lifecycle to establish those runtime effects.
4. **PROVEN** — `docs/reference/sdk.md` documents both cancellation levels, their persisted-delta behavior, snapshot consequences, and the explicit OneDrive/SharePoint limitation.

Human issue-level verdict against the original acceptance contract: **FAILED** because two mandatory criteria are not satisfied, even though the maintainer deliberately accepted a narrower Outlook-only implementation and merged/closed the work.

## Why this case matters

This case protects a critical distinction for PRTruth:

- a maintainer may intentionally narrow or replace an original requirement;
- a PR can be merged and its issue closed under that revised delivery decision;
- neither event makes the original acceptance criterion factually true.

PRTruth should therefore keep factual requirement truth separate from delivery/lifecycle resolution metadata such as accepted deviation, follow-up, superseded scope or waiver. A future model may record that the maintainer accepted the narrower delivery, but it must not rewrite the original OneDrive/SharePoint criterion into `PROVEN`.

The case also distinguishes API-wiring tests from behavioral lifecycle tests. A green exact-head CI run proves the added adaptation tests executed successfully, but it does not by itself prove that hard stop drops an in-flight unit or that graceful stop persists its delta link unless those behaviors are actually exercised by trustworthy tests or runtime evidence.
