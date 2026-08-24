# Manual oracle batch 24 — git failure diagnosis

Public case: `marcosfsousa/mcp-erp` issue #126 / PR #130.

## Why this case

This Python case has four explicit acceptance criteria and a useful CI-provenance boundary. The implementation changes a diagnostic helper so a failed `git` read is never silently reclassified as “path not in HEAD”, adds regression tests that corrupt Git objects, and updates the module contract. The exact PR head has a successful GitHub Actions run whose `The flow drivers' Docker-free halves` step executes `tests/test_transcript_drift.py` directly.

The same workflow also contains a different drift-reporting command that intentionally uses `|| true`. That is valuable after PRTruth's failure-tolerant command hardening: a green workflow must not turn a failure-swallowing command into strict execution proof.

## Independent oracle

Oracle established before comparing PRTruth output.

| Acceptance criterion | Human verdict | Evidence |
| --- | --- | --- |
| Non-absence `git` failure names exit status/stderr and makes no committed-state claim | **PROVEN** | `GitFailed`, `failure(...)`, and `committed(...)` separate `ls-tree`/`show` failures from absence; regression tests corrupt committed Git objects and assert the diagnostic. |
| Genuine “path not in HEAD” keeps the prior message | **PROVEN** | `committed(...)` returns `None` only after successful `git ls-tree` with empty output; staged-path regression test reaches and asserts the existing `no committed copy` message. |
| Test simulates a non-missing-path Git failure | **PROVEN** | New tests delete committed tree/blob objects and assert nonzero `git` failure behavior. |
| Module docstring's Git-failure claim is true after the change | **PROVEN** | Module documentation now describes the `ls-tree` distinction, `GitFailed`, per-capture continuation, and nonzero return behavior implemented below it. |

Human issue-level verdict: **PROVEN (4/4)**.

## Exact-head CI

Target PR head: `d1c5c6163ecfdad8764abcd0cd7bdf25b43c1471`.

GitHub Actions run `CI` #144 completed successfully. The `Lint and types` job completed `Lint`, `Format`, `Types`, and `The flow drivers' Docker-free halves` successfully. Workflow source shows that the latter explicitly runs:

```text
uv run pytest tests/test_tokens.py \
              tests/test_conformance_client.py \
              tests/test_transcripts.py \
              tests/test_transcript_drift.py
```

This is strong execution evidence for the focused regression suite, but it is not by itself semantic proof of every criterion.

## PRTruth comparison

The real public rerun on current PRTruth source extracts exactly four requirements and returns:

- overall verdict: `NOT_PROVEN`;
- `0 PROVEN`;
- `0 FAILED`;
- `4 UNPROVEN`.

All four disagreements with the human oracle are classified as **missing deterministic source/test-to-requirement adapters**, not extraction defects and not reasons to add lexical heuristics. PRTruth sees the right requirements but does not yet have a sound way to connect the exact implementation/test semantics to each one.

This conservative result is preferable to manufacturing proof from the generic green workflow. In particular, the workflow's separate `|| true` drift-reporting command must not be projected as strict successful execution evidence merely because its enclosing step/job is green.

## Safety invariant

Failure-tolerant command provenance remains non-authoritative. A command containing `|| true`, `continue-on-error`, or equivalent failure swallowing must never be treated as strict successful execution evidence just because its enclosing step/job is green.
