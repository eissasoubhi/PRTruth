# Manual oracle batch 29 — Svelte XSS hardening

## Public case

- Repository: `mydcc/cachy-app`
- Issue: #2201 — DashboardNav renders `preset.icon` through unsanitized `{@html}`
- PR: #2279 — sanitize DashboardNav preset.icon through DOMPurify
- Ecosystem: TypeScript / Svelte / Vitest / jsdom
- Evidence shape: security hardening, component-level DOM assertions, exact-head GitHub Actions, historical red-first claim

## Independent oracle

Issue #2201 defines exactly two acceptance criteria.

1. **A malicious-icon component regression test passes now and was failing before the fix. — UNPROVEN as a whole**
   - `DashboardNav.svelte` now applies `DOMPurify.sanitize(preset.icon)` directly at the `{@html}` sink.
   - The added jsdom component tests pass `<img ... onerror>`, `<script>`, and `javascript:` URL payloads and assert that executable markup does not survive in the rendered DOM.
   - The exact candidate head has a successful full `npm test` run, so the current-head half of the criterion is strongly evidenced.
   - However, the acceptance criterion explicitly includes a historical observation: the test was **failing before the fix**. No trustworthy before-state workflow run or equivalent structured execution evidence was found. A PR-body statement about red-first verification is not enough to turn that historical clause into deterministic proof.

2. **Existing navigation behavior remains identical for current callers. — PROVEN by independent review**
   - The added regression test renders the existing static SVG icon shape and an icon-less preset.
   - It verifies labels, active styling, and `onselect` forwarding.
   - The candidate changes only the icon sink plus test/backlog metadata; it does not alter the navigation interaction contract.
   - PRTruth currently keeps this row `UNPROVEN`, which is the correct conservative ceiling until source/test semantics can be associated deterministically.

Exact-head GitHub evidence for PR head `4b7240a8a407565bc668127ffbbc754c5cec3de5` includes a successful `Code Quality Audit` run with successful `TypeScript Type Check`, `ESLint`, and `Unit Tests` jobs. The unit-test workflow executes `npm test`, and `package.json` maps that command to `vitest run`.

Human evidence-aware requirement verdict: **1 PROVEN / 0 FAILED / 1 UNPROVEN**. The implementation itself is strongly correct, but the first requirement is conjunctive and its historical red-first clause is not independently observed.

## PRTruth comparison and verifier defect

The first real run exposed a verifier overclaim. PRTruth originally marked criterion 1 `PROVEN` solely because the exact candidate head had a successful `Unit Tests` job. Its reason was `All observed test checks completed successfully.` That evidence proves the test is green **after** the change; it cannot prove that the same test was observed failing on the pre-fix revision.

This is a generic provenance defect, not an XSS-specific problem. Batch 29 therefore adds a narrow fail-closed rule for explicit historical test requirements such as:

- `red-first`;
- `failing before the fix` / `failed prior to the fix`;
- `fails against the pre-fix implementation`;
- `failed on the previous version`.

Current-head green CI no longer promotes such a conjunctive requirement to `PROVEN`. Ordinary current-head test requirements remain unaffected. The rule intentionally does not infer history from PR prose, test filenames, or the existence of a regression test.

Criterion 2 remains a separate **missing deterministic source/test semantic adapter**: the focused component test strongly supports rendering/behavior preservation, but textual diff similarity alone is not enough for PRTruth to prove it automatically.

## Safety rules retained

Do not infer XSS prevention from `DOMPurify` appearing somewhere in a diff, from a test filename containing `xss`, or from a generic green CI result. Proof must retain the semantic link between the sink, sanitizer, hostile inputs, rendered postconditions, and exact candidate execution.

Likewise, never use current-head success as evidence of an asserted historical failure. Before-state claims need before-state evidence.
