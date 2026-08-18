# How PRTruth works

PRTruth is an evidence verifier for GitHub pull requests. Its job is not to decide whether code “looks good”. Its job is to decide what the available repository artifacts can actually support.

## Inputs

A verification starts with two GitHub objects:

1. an **issue**, which describes the requested work and acceptance criteria;
2. a **pull request**, which contains the proposed implementation and completion claims.

PRTruth then gathers supporting artifacts such as changed files, GitHub checks/Actions evidence, and repository instruction files.

## Verification pipeline

```text
Issue body
  ↓
Extract requirements

PR body
  ↓
Extract completion claims

PR head + repository
  ↓
Changed files + CI evidence + instructions

All evidence
  ↓
Evaluate each requirement/claim

PROVEN / FAILED / UNPROVEN
```

## Why deterministic first?

A language model can read a diff and make a useful review suggestion, but a plausible explanation is not the same thing as proof.

PRTruth therefore starts from deterministic evidence:

- a GitHub check either completed successfully, failed, or did not complete;
- a file either changed or did not change;
- an API/schema compatibility check either produced evidence or did not;
- a signed receipt either validates or it does not.

This makes a PRTruth result reproducible and easier to audit.

## What `PROVEN` means

`PROVEN` means PRTruth found a rule-backed piece of evidence that is strong enough for the specific statement.

Example:

```text
Claim: Tests pass
Evidence: GitHub Actions test step completed successfully
Result: PROVEN
```

It does **not** mean the whole application is correct.

## What `FAILED` means

`FAILED` means available deterministic evidence contradicts the statement.

Example:

```text
Claim: Tests pass
Evidence: PHPUnit job failed
Result: FAILED
```

## What `UNPROVEN` means

`UNPROVEN` is a first-class result, not an error.

Example:

```text
Requirement: Only admins can delete users
Evidence: admin controller changed, CI is green
Result: UNPROVEN
```

A changed controller and green CI are relevant, but they do not necessarily prove that non-admin users are denied access. A stronger adapter or explicit authorization test would be needed.

## Does PRTruth use AI?

The core verifier in the current release does **not** send repository code to an LLM for a semantic correctness verdict.

That is deliberate. PRTruth is designed around the rule:

> AI may help find candidate evidence in the future, but `PROVEN` should still require evidence that can be shown and checked.

A future semantic layer can therefore help answer “where should PRTruth look?”, while deterministic adapters remain responsible for deciding whether a proof is strong enough.

## Why this matters for AI coding agents

Coding agents can produce large pull requests quickly and can also write confident completion summaries. The bottleneck then moves from generating code to verifying claims.

PRTruth is intended to sit between generation and merge:

```text
Human or coding agent
        ↓
Pull request + completion claims
        ↓
PRTruth evidence verification
        ↓
Reviewer / merge policy
```

It is vendor-neutral: the same evidence model can be used for Codex, Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, or a human-written PR.

## Current limitations

PRTruth intentionally leaves some requirements `UNPROVEN` when it lacks a strong adapter. Current limitations include:

- arbitrary business logic cannot be proven merely from a filename match;
- green CI does not prove that every edge case is covered;
- broad statements such as “no regressions” need more than normal CI;
- semantic code understanding is not yet used as a source of truth;
- evidence quality depends on the quality and granularity of the repository's CI and acceptance criteria.

These limitations are preferable to silently converting weak heuristics into false certainty.

## Good issue and PR structure

PRTruth works best when issues contain explicit acceptance criteria:

```markdown
## Acceptance criteria
- Admin users can export a CSV
- Non-admin users receive 403
- Export tests pass
```

and PRs state concrete completion/validation claims:

```markdown
## What changed
- Added the CSV export endpoint
- Added authorization checks

## Validation
- Export tests pass
- Typecheck passes
```

That structure is useful for human reviewers even without PRTruth, and it gives verification tools clear statements to evaluate.
