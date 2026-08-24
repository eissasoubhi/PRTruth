# Manual oracle batch 18 — exact-head CI versus container-runtime proof

## Public case

- Repository: `The-Running-Dev/SubZeroDev.SkyNetHR`
- Issue: #197 — graceful shutdown drains streams and agent processes
- PR: #213 — merged into `main`
- Exact PR head: `cd404c183f4d556dd378d59504a521530035ca66`

Issue #197 defines seven explicit `Done when` criteria: stop accepting requests after SIGTERM, close SSE/WebSocket connections, terminate and await child-process trees, release the storage lock within a global deadline, clean first-signal versus forced second-signal behavior, regression coverage with persistent transports/child processes, and a container smoke proving shutdown completes without escalation.

## Independent inspection

PR #213 implements the shutdown ordering and contains substantial focused evidence. Its exact head has a successful GitHub `verify` workflow. The PR description records that Linux CI executed the shutdown subprocess regressions that were skipped on the author's Windows host, including the real SIGTERM path.

That exact-head platform evidence is stronger than the local Windows result and is relevant to several process/signal criteria. However, the PR's verification section lists `npm test`, PowerShell parsing, and Pester. It does not provide an observed container shutdown smoke or evidence that a container stop completed without escalation.

The PR also explicitly documents residual gaps in narrower shutdown subcases. Those caveats are useful evidence boundaries, not reasons to reinterpret green CI as universal runtime proof.

## Human oracle

The implementation plus exact-head Linux CI strongly support much of the shutdown behavior. In particular, platform CI can legitimately strengthen claims whose tests were skipped only because the author's machine was Windows.

The final issue criterion is materially stronger: **a container smoke test verifies shutdown completes without escalation**. A green Linux unit/subprocess lane is not the same observation as starting the application in a container, sending the real stop signal through the container runtime, and observing clean termination without escalation.

The safe conclusion is therefore **strong partial proof with a container-runtime evidence gap**. The issue as a whole must not become `PROVEN` solely because the exact-head verify matrix is green.

## Classification

This case protects a **scope-provenance ceiling**:

- local Windows skip does not invalidate exact-head Linux evidence when Linux CI actually executes the relevant tests;
- exact-head Linux CI must not be widened into container-runtime proof;
- issue closure/merge does not fill the missing container observation.

A future evidence-scope model may distinguish platform subprocess tests from container-runtime/live deployment evidence. Until then, `UNPROVEN` for the container-smoke criterion is safer than a false `PROVEN`.

No project-specific matcher is justified by this case.
