# Manual oracle batch 30 — split delivery across pull requests

## Public case

- Repository: `nexu-io/open-design`
- Issue: `#6916` — Project card menu is clipped near the viewport bottom
- Target PR: `#7087` — test(e2e): cover grid project menu overflow
- Earlier production PR: `#6971` — fix web list project menu placement near viewport edge

The issue has four explicit acceptance criteria: placement accounts for viewport and scroll-container boundaries; placement recalculates after scroll/resize/menu-size changes; Delete stays visible near the bottom edge; and a browser regression test covers the viewport-edge case.

## Independent oracle

This history is deliberately split across deliveries.

PR #6971 already changed the shared production menu placement. Its description records the upward flip, downward behavior when space exists, recalculation after scrolling/resizing/menu-size changes, and a list-view browser regression witness. It merged on 2026-08-17.

PR #7087 is explicitly test-only. Its one-file patch adds a Playwright grid/card regression that places the final card near the bottom of the scroll area, opens the overflow menu, asserts Delete is in the viewport, and asserts the menu is above the trigger. It does not change runtime implementation.

Human assessment for the issue state represented by the combined history is therefore strongly supportive of all four criteria, but attribution to the target PR is different: the first three are pre-existing behavior from #6971, while #7087 contributes the missing grid/card browser witness for the fourth criterion.

The exact target head `5be44fdb1daff5ed160fc3ae949eefd57f1a88ab` has a pull-request workflow conclusion of `action_required` and exposes no completed jobs through the public jobs endpoint. The PR description reports local typecheck and focused Playwright validation, but those claims are not promoted to trustworthy exact-head execution evidence.

## Classification

This is primarily a **delivery-attribution / pre-existing-state model gap**, not a reason to loosen verifier semantics.

A verifier scoped to PR #7087 must not claim that the target PR itself implemented the first three criteria merely because the current repository state contains the earlier production fix. Conversely, issue-level completion may legitimately aggregate evidence from multiple PRs. Those are different questions and should eventually be represented explicitly.

The fourth criterion also demonstrates the execution-provenance boundary: the test source is directly observable in the patch, but the target head currently lacks successful GitHub Actions job evidence. A PR description saying `2 passed` is not equivalent to an authoritative exact-head run.

No verifier change is made in this batch. The corpus guard requires exactly four extracted criteria and forbids a global `PROVEN` result for this target PR with the currently observable evidence.
