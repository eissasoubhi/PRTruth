# Manual oracle batch 31 — external-service workflow claims

## Public case

- Repository: `zesty-io/manager-ui`
- Issue: `#4231` — CI - Automated Sentry Issue Root-Cause Analysis
- Target PR: `#4269` — CI - Add automated Sentry issue root-cause analysis workflow
- Exact target head: `28f92da44c23b361d01fd32fc30c031b83eeb523`

The issue has six explicit acceptance criteria covering the `issues: opened` trigger, silent handling of ordinary issues, Sentry fetch plus RCA generation, a single analysis comment, graceful fetch failure, and no action for non-Sentry-origin issues.

## Independent oracle

The target patch is strong source evidence for the workflow shape and fail-closed filtering. The PR also records live testing against historical Sentry-origin issues, including negative and fetch-failure cases. However, those live-test claims are narrative PR evidence rather than independently observable exact-head execution evidence.

The exact target head has three successful pull-request workflows (`ci`, `Claude Auto Review`, and `Claude Change Verifier`). The main `ci` run executes the repository test suite, but it does not exercise the new `issues: opened` workflow against Sentry MCP or prove that a real issue comment was posted. Therefore a green PR CI run cannot by itself prove the external-service/runtime acceptance criteria.

Human assessment:

1. **PROVEN (source/structure):** the workflow trigger is restricted to `issues: opened`.
2. **PROVEN (source/structure):** the workflow has an explicit early filter for non-Sentry-origin issues and is designed to stay silent there.
3. **UNPROVEN (live external behavior):** source strongly supports Sentry MCP fetch and RCA generation, but exact-head CI does not perform an independently observable authenticated Sentry fetch.
4. **UNPROVEN (live side effect):** source strongly supports posting one analysis comment, but exact-head PR CI does not demonstrate the GitHub issue side effect.
5. **UNPROVEN (live failure path):** the graceful failure branch exists and the PR reports prior live testing, but no exact-head execution witness proves the external failure path.
6. **PROVEN (source/structure):** the first-line Sentry-origin guard plus bot-origin check makes ordinary issues fail closed before expensive/action steps.

## Classification

This is an **evidence-scope / external-service execution gap**. Source inspection can prove static workflow properties, while authenticated Sentry retrieval and GitHub issue-comment side effects require a live execution witness with the correct trigger and external-service provenance.

PRTruth must not promote all six criteria merely because the target PR's ordinary CI is green. Narrative claims that live testing happened before the PR was opened are useful human context but are not exact-head structured execution evidence.

No verifier semantic change is justified by this case alone. A future deterministic adapter should distinguish workflow-source facts from trigger-specific runtime facts and external-service side effects.