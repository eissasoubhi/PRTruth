# Manual oracle batch 9 — security guard and superseded lifecycle

This batch adds a security-sensitive Python case where the implementation at the target PR head is strongly evidenced, but the pull request was later closed because upstream removed the guarded subsystem entirely. It is useful because requirement truth at a historical head and current PR lifecycle are different questions.

## Case

- Repository: `rjmurillo/ai-agents`
- Issue: #4930, `fix(hooks): push-pr helper is denied before execution`
- PR: #5106, `fix(hooks): allow --prepare-body-file and env --chdir in push-pr guard`
- Target head: `c0a57de99364ee69a0abb4e465ed71fd02d0bf67`
- PR state: closed, not merged

The issue has exactly four explicit acceptance criteria. PRTruth correctly extracts all four.

## Independent human oracle

### 1. The exact documented prepare command is allowed — PROVEN at the target head

The final implementation admits standalone `--prepare-body-file` and the focused test `test_prepare_body_file_bare` executes the documented `python3 -I ... --prepare-body-file` form and requires return code 0.

### 2. External worktrees can select their working directory without an untrusted dynamic evaluator — PROVEN at the target head

The implementation admits only a narrow, verified `env --chdir` / `-C` prefix. It resolves the launcher against an OS-default search path independent of ambient `PATH`, compares executable content to the trusted system `env`, rejects shell expansion, and requires the requested directory to resolve exactly to the hook's own `cwd`.

This is materially stronger than the first revision. Review found that reusing the general `_effective_command_index` classifier allowed attacker-controlled `PATH`, fake `env`, divergent working directories, and shell expansion. The final patch replaces that open prefix grammar with explicit trust checks and adds negative controls.

### 3. Denials include the matched rule and remediation — PROVEN at the target head

`_deny()` emits the reason plus an exact documented remediation form. The added tests assert remediation output rather than relying on PR prose alone.

### 4. Negative controls still deny direct `gh pr create` when the guarded helper is available — PROVEN at the target head

The focused test suite includes the direct-`gh pr create` negative control plus attacker-shaped cases for poisoned `PATH`, fake `env`, unsupported wrappers/options, divergent `--chdir`, shell expansion and duplicate prepare flags.

## Structured evidence

The exact target head has a successful `Python Tests` workflow. Its pytest partitions, final `Run Python Tests` aggregation, and `Python Security Checks` all completed successfully; the security job ran both pip-audit and Bandit successfully.

The same SHA also has an earlier `PR Validation` run that failed at `Enforce Blocking Issues`, followed by a later `PR Validation` run whose corresponding step succeeded. This is a useful warning for future CI adapters: a verifier must not treat an older run on the same commit as the final state when a later authoritative rerun supersedes it.

## Lifecycle evidence

The PR was not rejected because the final security patch was disproven. A maintainer comment closes it as **superseded by `main`**: PR #5156 removed the push-pr script identity guard and its companion modules entirely. The closing note explicitly says the CWE-426 / CWE-367 / CWE-22 fixes are real and well-tested, but now apply to code that no longer exists.

That gives two simultaneous facts:

- historical requirement assessment at PR #5106 head: **4/4 PROVEN**;
- current delivery outcome: **SUPERSEDED / obsolete, not mergeable product work**.

A three-state requirement model alone cannot express both facts. Treating `closed` as `FAILED` would be wrong; treating the PR as currently shippable because its old requirements were satisfied would also be wrong.

## PRTruth result

Current PRTruth reports:

- overall: `NOT_PROVEN`
- requirements: `0 PROVEN / 0 FAILED / 4 UNPROVEN`

The extraction is correct. The four disagreements are conservative evidence ceilings: PRTruth does not yet map arbitrary Python guard semantics and focused negative-control tests to these natural-language requirements.

No fuzzy source/test keyword adapter is added. The stronger finding from this case is a **lifecycle/status-model gap**: requirement verification and delivery disposition should be modeled independently so future integrations can represent states such as `SUPERSEDED`, `WAIVED`, or `FOLLOW_UP` without corrupting factual requirement verdicts.

## Classification

| Area | Human oracle | PRTruth | Classification |
| --- | --- | --- | --- |
| Exact prepare command | PROVEN | UNPROVEN | missing deterministic source/test semantic adapter |
| Safe external-worktree selection | PROVEN | UNPROVEN | missing security/domain adapter |
| Denial remediation | PROVEN | UNPROVEN | missing deterministic output/test adapter |
| Direct `gh pr create` negative control | PROVEN | UNPROVEN | missing test-semantic adapter |
| PR closed after subsystem removal | SUPERSEDED lifecycle | not represented in requirement statuses | status-model gap |
| Older failed PR Validation followed by successful rerun on same SHA | latest rerun is authoritative | no generic change in this batch | evidence-ordering design case |

## Decision

No verifier rule is changed in this batch. The correct conservative behavior is preferable to introducing lexical proof shortcuts. The corpus now preserves this case as a design constraint for future deterministic test adapters and an orthogonal delivery-lifecycle model.
