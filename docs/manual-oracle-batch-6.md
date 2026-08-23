# Manual oracle batch 6 — ASP.NET Core cache hardening

## Case

- Repository: `dotnet/aspnetcore`
- Issue: #67907 — harden Response/Output cache base-key serialization across `PathBase` and `Path`
- PR: #68517 — merged
- Exact PR head reviewed: `856853206e9b02ea78d4067521d541e67194fc86`

The issue defines seven explicit acceptance criteria. Current PRTruth extracts exactly those seven and returns `0 PROVEN / 0 FAILED / 7 UNPROVEN`, overall `NOT_PROVEN`.

## Independent oracle

The implementation is unusually reviewable because the behavioral change is narrow: both cache-key providers insert the already-reserved `KeyDelimiter` between normalized `PathBase` and `Path`, in both case-sensitive and case-insensitive branches. Both key-provider test suites add the same injectivity regression matrix.

| Acceptance criterion | Independent assessment | PRTruth | Classification |
| --- | --- | --- | --- |
| Distinct `(PathBase, Path)` pairs with equal concatenations produce distinct base keys in both providers | `PROVEN`: both providers insert the delimiter at the field boundary; both test suites compare `/a` + `/b` against `/a/b` + empty and assert distinct keys | `UNPROVEN` | missing deterministic source/test-semantic adapter |
| Property holds with `UseCaseSensitivePaths` enabled and disabled | `PROVEN`: both source branches insert the delimiter and both new tests are theories over `true` and `false` | `UNPROVEN` | missing deterministic source/test-semantic adapter |
| Empty `PathBase` + full `Path` differs from full `PathBase` + empty `Path` | `PROVEN`: both new tests explicitly compare those two cases | `UNPROVEN` | missing deterministic test-semantic adapter |
| Equal pairs stay deterministic and delimiter rejection is unchanged | `PROVEN` at source level: serialization remains a deterministic append sequence and the patch does not alter delimiter validation/rejection logic | `UNPROVEN` | missing deterministic source-invariant adapter |
| Output Cache host suppression, key prefix and vary dimensions continue to function without removing the boundary | `PROVEN` at source/regression level: the patch changes only the base-key boundary; existing exact-value tests for ignored host, prefix, route/header/query/vary composition are retained and their expected base-key strings include the new delimiter | `UNPROVEN` | missing deterministic regression-preservation adapter |
| Response/Output key-provider unit tests lock injectivity | `PROVEN`: focused injectivity tests are added to both `ResponseCachingKeyProviderTests` and `OutputCacheKeyProviderTests` | `UNPROVEN` | missing deterministic test-association adapter |
| Compatibility note for shared/persistent stores is documented | `PROVEN` only at engineering-record level: the issue itself contains the one-time cold-cache/no-legacy-fallback compatibility note; PR #68517 changes no product documentation | `UNPROVEN` | conservative result retained; whether issue documentation satisfies this criterion is project-policy dependent |

Human issue-level assessment: **6 criteria strongly PROVEN by implementation/tests; the documentation criterion is policy-dependent rather than safe for automatic promotion.** No criterion is observably contradicted by the PR.

## CI evidence boundary

The exact PR head exposes a successful GitHub `Markdownlint` workflow, but the relevant ASP.NET Core build/test infrastructure is not represented by GitHub Actions data available to this oracle. The human assessment above therefore does not pretend that a generic green GitHub check executed the changed .NET tests. It relies on the reviewable diff and retained test code for source-level factual assessment.

This is useful negative evidence for PRTruth design: source/test semantics can be very strong to a human while still being unsafe to infer generically from filenames or keywords. No fuzzy matcher is added.

## Result

Batch 6 adds a .NET hardening case with explicit requirements, dual implementation paths, parameterized tests and compatibility semantics. It produces no verifier change because the current `UNPROVEN` ceiling is conservative rather than a demonstrated false `PROVEN` or evidence-ingestion defect.
