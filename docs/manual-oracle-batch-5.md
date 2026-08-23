# Manual oracle batch 5 — UI and release semantics

This batch compares PRTruth with an independent human review of two public pull-request histories. The human oracle is recorded before looking at PRTruth's result and is not automatically converted into verifier rules.

## `d-hinders/Haven-AI` issue #1803 / PR #1942

The issue has four explicit acceptance criteria for the 320px TopBar defect. Independent review finds all four strongly supported at the target PR head:

- the PR removes the width-scoped legibility exception and adds focused browser assertions;
- the PR reports measured 320px/390px values for rendered text and control gaps;
- the exact PR head `6d337681c88346d44bba1175a311c2d14a4d37b7` has successful CI plus successful docs/design/copy gates;
- the PR was merged and the issue was closed as completed.

This is intentionally a difficult oracle for PRTruth. Browser-measured business/UI behavior should not become `PROVEN` merely because generic CI is green. A disagreement can therefore be a safe evidence-model ceiling rather than a verifier defect unless PRTruth has structured evidence that actually scopes to the browser assertions.

## `azholdaspaev/netty-loom-spring` issue #31 / PR #176

The issue requests a publish workflow with snapshot-on-main and release-on-tag behavior plus a real Central Snapshots dry run. The PR explicitly documents three departures from the original acceptance criteria and states that the dry-run criterion remains unfulfilled.

Independent oracle:

- do **not** treat the PR's own explanation of departures as proof that the original issue criteria were met;
- the Central Snapshots dry-run criterion is `UNPROVEN` for the target PR because the PR explicitly says it was not performed;
- generic green build/actionlint evidence must not prove Maven Central publication or secret-availability behavior;
- file-level existence/configuration requirements can have navigation evidence, but stronger behavioral claims still need deterministic runtime evidence.

This case guards against a dangerous false-`PROVEN` pattern: a detailed PR description and green CI must not overwrite the issue's original contract.

## Safety rule

Human review and PRTruth output are independent signals. Investigate disagreements. Do not add fuzzy semantic matching or weaken proof rules merely to make these examples agree.
