# Manual oracle batch 23 — OpenAPI codegen drift gate

Public case: `ApexChainx/ApexChainx-Frontend` issue #272 / PR #282.

## Why this case

This case directly exercises the boundary introduced by the workflow-source provenance work: the issue asks for a CI command to run, a deterministic fail-closed drift check, and a workflow file at an exact path. The exact PR head has a successful GitHub Actions run whose runtime step names match the workflow source.

## Independent oracle

The issue has exactly three acceptance criteria.

| Requirement | Human verdict | Evidence | Classification if PRTruth disagrees |
| --- | --- | --- | --- |
| CI runs the OpenAPI codegen step | **PROVEN** | Exact-head workflow run `API Codegen Drift Check` succeeded; job `Verify generated types are up to date` contains a completed-successful `Run OpenAPI codegen` step. Exact workflow source binds that unique step to `npm run codegen` with `OPENAPI_SPEC_URL=http://localhost:8000/openapi.json`. | Missing deterministic execution-command adapter if left `UNPROVEN`. |
| CI fails if generated types differ from committed | **PROVEN** as an implemented CI gate | Exact workflow source has a uniquely named `Fail if generated types drifted` step executing `git diff --exit-code -- src/types/api.generated.ts`, emitting an error and exiting 1 on drift. The exact-head runtime reports this step completed successfully, proving the gate executed on the candidate head without drift. | Missing deterministic workflow-source/runtime semantic adapter if left `UNPROVEN`. Do not infer this from generic green CI alone. |
| Workflow file exists at `.github/workflows/api-codegen-check.yml` | **PROVEN** | The exact PR head contains that file and the successful run is sourced from the corresponding workflow. | Missing exact-path source adapter if left `UNPROVEN`. |

Human issue-level verdict: **3/3 PROVEN**.

## Safety boundary

This case must not be solved by treating any green workflow as proof that arbitrary CI-related prose is true. The useful evidence chain is narrower:

1. exact candidate head;
2. exact workflow path;
3. globally unique executable source step name;
4. exact source command;
5. matching GitHub runtime step reported `completed` + `success`;
6. requirement semantics narrow enough to be represented by that command/source fact.

PRTruth now has reviewed primitives for steps 1–5, but those primitives are intentionally not yet connected to verdict evaluation. Batch 23 records the real-world oracle needed before that integration is attempted.

## External evidence inspected

- Issue #272: explicit `Acceptance criteria` section with three checklist entries.
- PR #282 exact head: `e1313ab53d08082715686a7f8877639477f8ef74`.
- Exact-head run `API Codegen Drift Check` concluded `success`.
- Runtime job `Verify generated types are up to date` completed both `Run OpenAPI codegen` and `Fail if generated types drifted` successfully.
- Exact workflow source runs `npm run codegen` and uses an explicit `git diff --exit-code` fail-closed branch.

No release/package changes are part of this batch.
