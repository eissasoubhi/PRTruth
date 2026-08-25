# Manual Oracle Batch 36 — lease-backed certificate authority

## Public case

- Repository: `cfg-is/cfgms`
- Issue: #3541
- Pull request: #3555
- Ecosystem: Go / HTTP controller / certificate-security gates

## Independent oracle

Issue #3541 defines six explicit acceptance criteria for certificate issuance, signing-key rotation, and revocation. The target PR was merged at exact head `f06cd494520603e32c1fe7402c3c8a4dff213aba`.

Independent inspection of the issue, the PR patch, and exact-head GitHub Actions gives this factual assessment:

1. **PROVEN** — all three mutating certificate handlers place the lease-backed `registrationLeaderStatus` rejection before their existing operation paths and return HTTP 503 when the checker exists but is non-authoritative.
2. **PROVEN** — focused tests exercise all three handlers with a non-authoritative checker and verify the protected certificate operation is not performed.
3. **PROVEN** — focused passthrough tests cover nil and authoritative checkers reaching the existing certificate paths.
4. **PROVEN with repository-test evidence** — the exact-head `Test Suite Validation / unit-tests` job completed successfully and ran the repository's fast unit-test gate. This supports the unchanged existing unit-test surface, although it is narrower than a full repository integration run.
5. **RESOLUTION / N-A, not factual proof** — the issue explicitly delegates documentation to Story G. This is lifecycle metadata about ownership of the criterion, not evidence that this PR produced documentation.
6. **UNPROVEN as written** — the issue requires `make test-complete`, while the target PR body names `make test-agent-complete`; the exact-head PR workflow exposes a successful unit-test job but its integration job is an explicit PR-time stub and several broader jobs are skipped. The observable PR evidence therefore does not prove the exact `make test-complete` requirement.

The issue-level factual completion status is therefore not safely reducible to a simple 6/6 PROVEN vector. It combines four supported criteria, one explicit out-of-scope/delegated resolution, and one execution requirement that remains unproven from exact-head public evidence.

## Why this case matters

This case protects two boundaries:

- a criterion explicitly marked `Docs: N/A ... Story G owns ...` must not be silently converted into ordinary `PROVEN` merely because the issue and PR are closed/merged;
- a successful exact-head unit-test workflow must not be widened into proof of a differently named full-suite command, especially when the same workflow exposes an integration-test stub and skipped broader jobs.

If PRTruth remains `UNPROVEN` for those rows, that is a valid conservative result. A future improvement should model explicit requirement resolution (`N/A`, delegated/follow-up) separately from factual evidence status and should associate exact execution commands only when deterministic workflow/log provenance proves them.
