# Architecture

PRTruth is designed as a small evidence pipeline rather than an AI agent.

```text
GitHub issue ───────────────┐
PR description / diff ─────┤
CI check runs ──────────────┼─> evidence collection ─> requirement evaluation ─> report
Repo instructions ─────────┤
Future evidence adapters ──┘
```

## Core modules

### `repository`

Detects the current `owner/repo` from local Git metadata when `--repo` is not provided.

### `github`

Thin GitHub REST client. Network behavior belongs here so verification logic can remain testable.

### `requirements`

Extracts explicit acceptance criteria from existing issue text. Extraction should remain deterministic where possible.

### `verify`

Maps each requirement to available evidence and chooses one of:

- `PROVEN`
- `FAILED`
- `UNPROVEN`

The verifier should never infer success merely because relevant files changed.

### `report`

Presentation only. Terminal, Markdown, JSON receipts, and future GitHub comments should all reflect the same underlying verification report.

## Design constraints

1. **Zero-config first.** Useful output should be possible for an existing issue and PR without a new DSL.
2. **Deterministic evidence first.** CI results, repository contents, diffs, and explicit metadata outrank probabilistic judgments.
3. **Explain every verdict.** Each requirement result should carry a reason and evidence list.
4. **Fail toward uncertainty.** Missing evidence means `UNPROVEN`, not success.
5. **Vendor-neutral core.** Agent-specific adapters should add evidence, not own the verification engine.

## Extension model

Future evidence adapters should transform an external signal into a small evidence object rather than directly setting a verdict. This keeps the decision logic centralized and auditable.
