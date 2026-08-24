# Manual oracle batch 29 — Svelte XSS hardening

## Public case

- Repository: `mydcc/cachy-app`
- Issue: #2201 — DashboardNav renders `preset.icon` through unsanitized `{@html}`
- PR: #2279 — sanitize DashboardNav preset.icon through DOMPurify
- Ecosystem: TypeScript / Svelte / Vitest / jsdom
- Evidence shape: security hardening, component-level DOM assertions, exact-head GitHub Actions

## Independent oracle

Issue #2201 defines exactly two acceptance criteria.

1. **Malicious icon markup is stripped by a component regression test. — PROVEN**
   - `DashboardNav.svelte` now applies `DOMPurify.sanitize(preset.icon)` directly at the `{@html}` sink.
   - The added jsdom component tests pass `<img ... onerror>`, `<script>`, and `javascript:` URL payloads and assert that executable markup does not survive in the rendered DOM.
   - The test also checks that a benign image may remain, proving sanitization rather than blanket removal.

2. **Existing navigation behavior remains identical for current callers. — PROVEN**
   - The added regression test renders the existing static SVG icon shape and an icon-less preset.
   - It verifies labels, active styling, and `onselect` forwarding.
   - The candidate changes only the icon sink plus test/backlog metadata; it does not alter the navigation interaction contract.

Exact-head GitHub evidence for PR head `4b7240a8a407565bc668127ffbbc754c5cec3de5` includes a successful `Code Quality Audit` run with successful `TypeScript Type Check`, `ESLint`, and `Unit Tests` jobs. The unit-test job executes the repository unit suite on the exact candidate head.

Human requirement verdict: **2 PROVEN / 0 FAILED / 0 UNPROVEN**.

## PRTruth comparison

The batch intentionally does not teach PRTruth that a generic green unit-test job proves arbitrary security semantics. The useful deterministic facts here are split across source and focused test code:

- sanitizer placement at the exact dangerous sink;
- concrete hostile payloads and DOM postconditions;
- preservation assertions for current rendering and callback behavior;
- exact-head successful unit execution.

If PRTruth keeps either criterion `UNPROVEN`, classify that as a **missing deterministic source/test semantic adapter**, not as a reason to add lexical matching. A future safe adapter would need to associate the changed sink and focused test assertions with the specific requirement while preserving exact-head execution provenance.

This case also protects an important distinction: the issue explicitly says there was **no live exploit vector yet**. The requirement is to harden a component contract before future user-controlled inputs reach it. PRTruth must not require evidence of a production exploit to prove that the requested preventive change was implemented.

## Safety rule retained

Do not infer XSS prevention from `DOMPurify` appearing somewhere in a diff, from a test filename containing `xss`, or from a generic green CI result. Proof must retain the semantic link between the sink, sanitizer, hostile inputs, rendered postconditions, and the exact candidate execution.
