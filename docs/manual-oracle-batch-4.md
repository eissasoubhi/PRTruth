# Manual oracle batch 4 — Java and JavaScript

Batch 4 adds two public cases with deliberately different lifecycle and CI shapes. The comparison separates issue-intent extraction, product evidence, unrelated CI failures, and repository contribution policy.

## Elasticsearch issue #143697 / PR #147293 — Java

Issue #143697 is an automatically generated CI-triage issue for `GenerativeMetricsIT`. Its `Build Scans` section contains links to failing build scans and its `Issue Reasons` section contains a historical failure-rate bullet. Neither is a desired post-change state.

The first real PRTruth run extracted those three bullets as requirements. That is a requirement-extraction defect. The extractor now excludes only the observed generated metadata sections `Build Scans` and `Issue Reasons`; fenced reproduction/failure content was already excluded by the existing code-fence handling. A regression test preserves this boundary.

Independent review of PR #147293 supports the targeted fix itself:

- `TranslateTimeSeriesAggregate` now restricts time-bucket discovery to named expressions actually referenced by groupings instead of scanning every named expression in the child plan.
- `LogicalPlanOptimizerTests` adds a focused regression for the exact false-positive shape: an `EVAL date_trunc(@timestamp)` alias later overridden by a non-grouping `STATS` output while the real grouping uses `bucket(@timestamp, 1h)`.
- The muted generative test is re-associated from #143697 to a newly filed, explicitly distinct follow-up #153507 rather than pretending the separate alias-collision bug was solved by this change.
- The PR changelog explicitly ties the fix to #143697.

Human assessment for the bug addressed by #143697: **PROVEN** by source-level causal change plus focused regression coverage. GitHub only exposes a successful exact-head `docs-build` workflow through the available public workflow data, so this oracle does not claim that Elasticsearch's entire external CI estate was green.

After the extraction fix, PRTruth should retain zero requirements for this generated triage template rather than inventing product intent from metadata. Representing the free-form failure as a requirement would need a principled bug-intent model, not a title or stack-trace heuristic.

Classification: **requirement-extraction defect fixed**, with a remaining conservative free-form bug-intent gap.

## Vite issue #23267 / PR #23268 — JavaScript / TypeScript

Issue #23267 is free prose: when a non-default config loader is explicitly selected, the future native-loader incompatibility warning should not be emitted. It has no acceptance/checklist section, so current PRTruth extracts zero requirements. That remains the safer boundary for now.

Independent implementation evidence for PR #23268 is strong even though the PR was closed rather than merged:

- the implementation distinguishes an omitted loader from an explicitly supplied loader while preserving `bundle` as the effective default;
- the native incompatibility warning is emitted only when the loader argument was omitted;
- a focused unit test asserts that explicitly selecting `bundle` produces no warning;
- on the exact PR head, the unit suite passed and `config.spec.ts` passed all 109 tests; lint, formatting, typecheck and build steps also passed;
- the latest broad CI failure came from an unrelated CSS playground assertion (`async css order with css modules`, expected `pink`, received `black`) in the serve test, while Node 24 and Node 26 build/test jobs were green and the focused config tests remained green.

The PR lifecycle itself is also independent of the product evidence: a repository automation comment says the contribution was automatically flagged under Vite's AI-contribution policy, and the PR is closed/not merged. That process outcome is not evidence that the config-loader behavior is incorrect.

Human assessment of the proposed product fix: **PROVEN at the implementation/regression level**, but **not integrated upstream** because the PR is closed and unmerged. PRTruth should not collapse those two facts into one verdict, and this batch does not add a new lifecycle status just for this case.

Classification: conservative **free-form intent/model gap** plus a useful **lifecycle-policy vs product-evidence** oracle. No verifier heuristic is added.

## Batch 4 findings

1. Generated CI-triage links and failure-rate bullets are evidence/context, not requirements. Excluding the narrowly observed section names is a safe parser fix.
2. A failed broad CI run does not automatically falsify a focused requirement when the failing job is demonstrably unrelated and the relevant unit/build evidence is green.
3. Pull-request closure can be caused by contribution policy rather than product correctness. Product proof and upstream-integration state should remain distinct.
4. Free-form bug intent remains intentionally conservative. This batch does not infer requirements from issue titles, stack traces, or lexical overlap.
