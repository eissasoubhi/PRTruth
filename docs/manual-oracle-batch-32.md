# Manual oracle batch 32 — exact-head workflow_dispatch Windows CI

## Public case

- Repository: `cfg-is/cfgms`
- Issue: `#3470` — run `./cmd/...` on the Windows leg of `cross-platform-build`
- Target PR: `#3477` — add command-package tests to native builds
- Exact target head: `5d9e6824b3f7872d87053cd7c746574148105ba0`
- Authoritative execution witness: `workflow_dispatch` run `32795981991`

The issue has four explicit acceptance criteria. It also contains an unusually important provenance constraint: the ordinary pull-request `Build Gate` is only a `cross-compile-check` stub and does not execute the Windows native-build job. The issue explicitly requires a manually dispatched run of the real `cross-platform-build.yml` workflow on the feature branch.

## Independent oracle

Human assessment: **4/4 PROVEN**.

1. **PROVEN:** the exact-head workflow source executes `go test -v -short -timeout=8m ./cmd/...` on the Windows branch, in addition to the existing `./pkg/...` and `./features/...` invocation.
2. **PROVEN:** workflow run `32795981991` checks out exact head `5d9e6824...`; its `Native Build (Windows)` job and `Run Unit Tests` step complete successfully.
3. **PROVEN:** the exact Windows job log contains `--- PASS`, not `--- SKIP`, for all three required SCM tests: `TestServiceRegistrationOK_DetectsMissingService`, `TestRepairServiceRegistration_RecreatesService`, and `TestRepairServiceRegistration_ErrorsOnConflict`.
4. **PROVEN:** the target SCM tests were neither excluded nor build-tagged out and all execute successfully. The log contains unrelated platform/elevation skips elsewhere in the repository, but none hides the three tests this story exists to exercise and no surfaced target failure is papered over.

## PRTruth comparison

The real Batch 32 rerun produces **2 PROVEN / 0 FAILED / 2 UNPROVEN**, overall `NOT_PROVEN`:

1. **UNPROVEN** — source/workflow semantics are not inferred merely from the current diff and successful job.
2. **PROVEN** — PRTruth finds the exact-head manually dispatched Windows native-build execution rather than relying on the ordinary PR stub.
3. **PROVEN** — the requirement's explicit required-test/log language is matched to the successful exact-head Windows evidence and the quoted per-test PASS results.
4. **UNPROVEN** — a broad negative claim that no test was hidden/excluded is not promoted from green execution evidence alone.

This is the desired conservative boundary. The two remaining human/PRTruth disagreements are **missing deterministic source/negative-coverage adapters**, not a verifier defect that should be fixed with lexical similarity.

## Provenance boundary

This case must not be satisfied by the ordinary PR-time `Build Gate` check because that check is a stub. The authoritative witness is the successful exact-head `workflow_dispatch` execution of the real native-build workflow. Conversely, a manually dispatched run is not weaker merely because its event is not `pull_request`: when it checks out the exact candidate SHA and executes the workflow/job/step required by the issue, it is directly relevant structured evidence.

PRTruth's GitHub client enumerates Actions runs by exact `head_sha` without filtering the event type. Batch 32 therefore locks in two behaviors simultaneously: exact-head `workflow_dispatch` evidence may prove requirements that explicitly demand it, while unrelated green checks and execution evidence must not over-prove source-only or broad absence claims.

No verifier semantic change is justified by this case. The corpus guard freezes the observed status vector as `UNPROVEN / PROVEN / PROVEN / UNPROVEN` so future CI-evidence changes cannot accidentally regress either side of that boundary.
