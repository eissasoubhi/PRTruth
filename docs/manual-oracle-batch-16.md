# Manual oracle batch 16 — partial completion and lifecycle

## Public case

- Repository: `launchpad-26/buzz`
- Issue: #211 — KnowledgeAgent orchestration and `knowledge.*` interface
- PR: #573 — merged into `launchpad`
- Exact PR head: `4b760178df9ae4d1a58526a663a181f0a0d7a269`

The issue has six explicit `Definition of done` checklist items. PR #573 deliberately uses `Refs #211`, not a closing keyword, because its author states that two Definition-of-done items remain unmet and were split to #571 and #572. The PR also states that the project-intelligence Python suite is not executed by CI.

## Independent inspection

The candidate implements a substantial KnowledgeAgent surface and includes extensive local/unit and live-read evidence. However, the PR itself explicitly records two incomplete Definition-of-done items: depth-aware `knowledge.explain(...)` rendering and a runnable `knowledge.setup()` result. Those follow-ups are not presentation details; they are part of the parent issue's original completion contract.

At the exact PR head GitHub reports green workflow runs, but the main CI run's relevant product jobs are skipped and the PR author explicitly records that no CI job executes these Python tests. Green repository-level CI therefore cannot be treated as proof of the six issue-level requirements.

The parent issue is now closed even though follow-up #571 remains open. This is valuable lifecycle evidence: issue closure and PR merge are workflow decisions, not factual proof that every original requirement became true.

## Human oracle

- Overall original contract: **not fully satisfied by PR #573**.
- Strongly supported: orchestration/decision logic, six-section answer shape, provenance labeling, callable `knowledge.*` surface, and end-to-end trace behavior.
- Explicitly unresolved in the PR: depth-specific `explain()` rendering and runnable `setup()` behavior, tracked as follow-up work.
- CI evidence ceiling: exact-head GitHub workflows are green, but they do not execute the project-intelligence Python suite; local pasted test output remains weaker than independently observed CI execution.

## Classification

This case is primarily a **status/lifecycle model gap**, not a reason to weaken proof rules. PRTruth should eventually distinguish:

1. factual requirement status against the original issue contract;
2. requirement resolution such as split-to-follow-up / accepted partial delivery;
3. delivery lifecycle facts such as merged PR or closed issue.

Those dimensions must not collapse into `PROVEN` merely because maintainers merged the PR or later closed the parent issue.

The safe current behavior is conservative `UNPROVEN` wherever PRTruth lacks deterministic evidence. No project-specific lexical heuristic is justified by this case.
