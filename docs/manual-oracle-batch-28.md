# Manual oracle batch 28 — browser session identity storage

## Public case

- Repository: `perrykennethw/Wangz-Gamenight`
- Issue: #76 — Make player session identity storage failure-safe
- Pull request: #78 — fix: make player session storage failure-safe
- Exact candidate head: `44fbeeef8139771d0d3c38ba7430e7db67e218d3`

The issue has eight explicit acceptance criteria covering blocked browser storage, malformed/valid identifier handling, same-page fallback stability, migration-safe persistence, focused tests, unchanged server protections, and the repository verification gate.

## Independent oracle

Human assessment before comparing PRTruth: **8 PROVEN / 0 FAILED / 0 UNPROVEN**.

1. **Storage read/write failure does not block joining — PROVEN.** `createPlayerSessionIdProvider()` catches failures obtaining storage, reading keys, and writing the generated ID. `RoomClient.join()` now obtains its session ID only through this provider.
2. **Malformed IDs are replaced — PROVEN.** Stored values must match the bounded alphanumeric/hyphen session-ID contract. Invalid current-key values fall through to legacy migration or generation, and a generated replacement is persisted when storage permits it.
3. **Valid IDs are reused — PROVEN.** A valid value under `wangz-player-session-v1` is returned directly without invoking the generator.
4. **Fallback identity is stable for the page lifetime — PROVEN.** The provider captures `inMemorySessionId`; after the first successful read/migration/generation every later call returns the cached value even when storage is unavailable.
5. **Persistence contract is migration-safe — PROVEN.** The implementation introduces `wangz-player-session-v1`, accepts a valid legacy `wangz-player-session` value, persists it under the versioned key, then attempts to remove the legacy key.
6. **Focused failure-shape tests exist and execute — PROVEN.** `server/playerSessionIdentity.test.ts` covers missing, valid, malformed, legacy migration, throwing read, throwing write, and unavailable storage. `package.json` registers it as `test:player-session`.
7. **Existing server validation and duplicate protection remain unchanged — PROVEN for this candidate scope.** The PR changes only `package.json`, the new provider/test, and `src/roomClient.ts`; no server validation/participant implementation is modified. The repository verification script executes all existing integration `test:*` scripts.
8. **`npm run verify` passes — PROVEN.** The exact candidate head has GitHub Actions workflow `Verify` completed successfully. Its `Repository verification` job completed the `Verify repository` step successfully, and the workflow source binds that step directly to `npm run verify`. `scripts/verify.mjs` fail-closes on non-zero child exits and runs typecheck, build, every `test:*` script, then integration tests.

## Evidence boundary

This is a useful positive oracle because it combines several evidence shapes without requiring external services or hardware:

- direct source invariants;
- focused negative tests for storage exceptions;
- migration behavior;
- absence-of-change reasoning for server protections;
- exact-head CI tied to an explicit repository verification command.

A generic green check alone must not prove all eight criteria. For example, source semantics are needed to establish stable fallback identity and migration behavior; exact-head CI proves execution of the repository gate but does not by itself explain why each source-level requirement is satisfied.

## Expected PRTruth behavior

The batch requires exactly eight extracted requirements and rejects a global `PROVEN` verdict that hides any non-PROVEN row. If PRTruth remains conservative, disagreements should be classified as missing deterministic source/test association adapters rather than papered over with lexical similarity.

No Wangz-specific verifier rule is justified by this case. A future improvement should use reusable structured source/test provenance and exact-head command execution evidence.
