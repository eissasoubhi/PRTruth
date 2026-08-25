# Manual oracle batch 34 — final-head visual evidence

Target: `reitojike/stage-tracker` issue #109 / PR #110 (Next.js/TypeScript event-catalog UI semantics).

## Why this case

Issue #109 has 20 explicit acceptance criteria and a large regression matrix. The candidate PR was merged with exact-head GitHub Actions `Verify` green, and the implementation/tests strongly support the core selected-day behavior. The interesting edge is the visual-evidence contract: the PR initially carried screenshots from an earlier commit, then deliberately removed those PNGs from the final head and marked their raw links obsolete. The PR retains text describing a manual smartphone smoke that was observed in a Claude Code session.

This makes the case useful for separating three evidence classes that must not be conflated:

1. exact-head CI and executable regression tests;
2. human/manual observation recorded as text;
3. durable visual evidence actually tied to the final head.

A merged PR and green CI cannot manufacture class (3).

## Independent inspection

Exact candidate head: `1712f734b79b28303f849087fa7b08af38e883c5`.

GitHub Actions exposes a successful exact-head `Verify` run. Its `verify` job completed successfully through checkout, Node setup, dependency install, and the repository `Verify` step.

The PR patch and review evidence support the central behavior requirements: `selectEventLevelFallback` derives fallback membership per event/date, excludes events with an actual occurrence on the selected date, rejects dates outside the event range, and replaces the older query-range-wide `occurrences.length === 0` classification. Focused unit/auth regression cases cover the important complementary occurrence-vs-fallback cases. The merged PR also removes/renames the stale helper/component abstraction and leaves schema/migration/RLS untouched.

The visual-evidence history is materially different. A review comment first noted that visual evidence was still TODO. A later PR comment then documented that three screenshots had existed on an earlier commit but were removed from final head `1712f73`; the raw links were explicitly marked obsolete. The comment says the PO saw the screenshots in a Claude Code session and preserves only text evidence for the final state.

## Human oracle

The behavioral and cleanup criteria are largely **PROVEN** by source, focused tests, review inspection, and exact-head CI. The manual smartphone-smoke criterion has supporting human text evidence but no independently replayable artifact, so it is weaker than deterministic CI and should not be upgraded solely from the checked box.

The explicit criterion requiring representative visual evidence tied to the final head is **FAILED as written**: the final-head comment itself states that the PNGs were removed and the earlier raw links are obsolete. Text saying screenshots were viewed elsewhere is not the same artifact contract.

The final `Foundation Review Protocol / merge-ready fence` criterion is a lifecycle/process fact. Merge and green CI are consistent with it, but do not alone prove that the historical process stopped at the required fence before merge; absent direct lifecycle evidence, conservative treatment is appropriate.

## Expected PRTruth behavior

- Extract exactly the 20 explicit `Acceptance Criteria` rows from issue #109.
- Do not treat the large `Minimum regression cases`, `In scope`, `Out of scope`, or implementation notes as additional requirements.
- Do not mark the final-head visual-evidence criterion `PROVEN` from merged state, checked boxes, green CI, or text-only claims.
- Do not globally return `PROVEN` while that criterion lacks matching durable final-head evidence.

This batch intentionally does not add a screenshot/visual semantic adapter. The safe result is to stay conservative until PRTruth can consume a trustworthy final-head artifact provenance signal rather than infer one from prose.
