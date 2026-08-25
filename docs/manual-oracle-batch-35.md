# Manual oracle batch 35 — Python CI trigger and out-of-band branch protection

Target: `Seretos/agent-worktree` issue #168 / PR #173.

## Why this case

The issue asks to remove duplicate push-triggered test runs and make PR CI authoritative, but it also makes that safe only if `main` branch protection is enabled with PR-only merges and `tests` required. The merged PR explicitly states that branch protection is an out-of-band repository setting that still needs to be applied separately. This makes the case useful for separating code/workflow completion from delivery-policy completion.

## Independent inspection

The issue has exactly five acceptance criteria.

1. **`test.yml` only triggers on `pull_request` — PROVEN.** The PR patch removes the `push` trigger entirely and leaves `pull_request`. The workflow comment was updated consistently.
2. **A feature-branch push creates no test run — PROVEN from workflow semantics, but not from a historical push observation.** With no `push` event declared in `test.yml`, GitHub Actions will not schedule this workflow for a plain branch push. This is a source/configuration fact, not evidence that a particular past push was observed.
3. **A PR creates exactly one run per workflow — PROVEN for the target head.** GitHub exposes one exact-head `tests` workflow run for PR #173, with both Ubuntu and Windows matrix jobs succeeding. The workflow has one `pull_request` trigger and no duplicate `push` trigger.
4. **`release.yml` remains `workflow_dispatch` and does not add tests/lint — PROVEN.** `release.yml` is unchanged by the PR. Exact-head source still declares only `workflow_dispatch`; its jobs stamp/build/assemble release artifacts and do not add pytest/lint gates.
5. **`main` branch protection is active with PR-only merge and `tests` required — FAILED at the candidate delivery point.** The PR body explicitly says this repository setting "needs to be applied separately" and warns that without it a direct push to `main` remains untested. The code diff cannot satisfy this criterion. The branch-protection API is not readable through the current integration, so there is no later contradictory structured proof available in this oracle run.

Human issue-level verdict: **FAILED** because one mandatory acceptance criterion is explicitly outstanding even though the PR was merged and the issue closed.

## Comparison boundary

This case must preserve several distinctions:

- merged PR / closed issue is lifecycle metadata, not proof that every acceptance criterion became true;
- green PR CI proves the candidate tests ran successfully, not that repository branch-protection settings exist;
- workflow source can establish trigger configuration semantics, while repository settings require separate structured evidence;
- an explicit author admission that required out-of-band setup is still pending is material negative evidence and should not be overwritten by generic green-CI signals.

The corpus is fail-closed: until PRTruth has a trustworthy repository-rules/branch-protection evidence adapter and explicit semantics for author-declared outstanding setup, the branch-protection requirement must not become `PROVEN`.
