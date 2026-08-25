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

## Provenance boundary

This case must not be satisfied by the ordinary PR-time `Build Gate` check because that check is a stub. The authoritative witness is the successful exact-head `workflow_dispatch` execution of the real native-build workflow. Conversely, a manually dispatched run is not weaker merely because its event is not `pull_request`: when it checks out the exact candidate SHA and executes the workflow/job/step required by the issue, it is directly relevant structured evidence.

PRTruth's GitHub client currently enumerates Actions runs by exact `head_sha` without filtering the event type, so this batch tests whether the verifier uses that evidence correctly while remaining fail-closed around shell control flow and unrelated green checks.

No verifier change is justified unless the real rerun demonstrates a concrete mismatch. Any change must preserve the distinction between the PR stub and the exact-head dispatched native-build execution.
