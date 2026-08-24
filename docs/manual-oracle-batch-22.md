# Manual oracle batch 22 — Azure CLI external-fork promotion

## Target

- Repository: `Azure/azure-cli`
- Issue: #33965 — production validation of the Agent Assist persistent fork-promotion flow
- Pull request: #33967
- Ecosystem: Python monorepo / GitHub workflow and PR-process evidence

The issue is deliberately procedural. Its five acceptance criteria are mostly about *how* work moved from a fork into the upstream repository rather than about application behavior. That makes it a useful test of PRTruth's boundary between observable final state and unobservable intermediate process.

## Independent inspection

The public issue records that Agent Assist started a Copilot task in `a0x1ab/azure-cli` from exact base SHA `ae51706ce7aa5e37354516236320965b1e757d23`.

The resulting upstream PR exposes these structured facts:

- base repository/ref: `Azure/azure-cli:dev`;
- head repository: public fork `a0x1ab/azure-cli`;
- head SHA: `d33c845636ff04eb0b0b870215f187e213edb77a`;
- draft: `true`;
- commits: `1`;
- changed files: `1`;
- title: `[Core] Fix #33965: `az`: Add fork-flow validation file`;
- body has one H2 `## Description` prefix and no internal Agent Assist boundary markers or unused template examples;
- patch creates exactly `.agent-assist-fork-flow-validation-2.txt` with the required two lines;
- exact-head upstream GitHub Actions checks include successful CLI style/linter and blocked-label workflows.

The PR was intentionally closed without merge after production validation, matching the issue's disposable-validation lifecycle. Closure is not used as proof of any acceptance criterion.

## Human oracle

| Acceptance criterion | Human verdict | Reason |
| --- | --- | --- |
| Copilot work starts in `a0x1ab/azure-cli` from an exact-SHA temporary base | **PROVEN** | The issue's Agent Assist comment names the fork task and embeds the exact base SHA; the promoted PR base SHA matches it. |
| Agent Assist marks the Copilot fork PR ready and squash-promotes it as a one-commit draft PR from the fork into `Azure/azure-cli:dev` | **UNPROVEN** | The final public PR proves fork → upstream/dev, draft state and one commit, but does not expose the intermediate Copilot fork PR or its ready-for-review transition. Inferring that hidden transition from the final state would be unsound. |
| Promoted title uses a capital letter after the command-summary colon | **PROVEN** | Exact PR title is observable and uses `: Add ...`. |
| Promoted body contains exactly one generated `## Description` prefix after retries | **PROVEN** | The final body contains exactly one H2 `## Description`; the later bold `**Description**` field is not another generated H2 prefix. |
| Promoted PR uses external-fork CI routing and contains no internal boundary markers or unused template examples | **PROVEN** | GitHub reports the head repository as the public fork while exact-head upstream workflows ran successfully; direct body inspection shows none of the prohibited internal markers/examples. |

Independent issue-level result: **4 PROVEN / 0 FAILED / 1 UNPROVEN**. The unresolved row is a provenance/process gap, not evidence of failure.

## Expected PRTruth boundary

The important invariant is that PRTruth must not promote the second criterion merely because the final PR is a one-commit draft from a fork. The missing intermediate transition is a distinct historical fact.

This case is therefore valuable even if PRTruth leaves several or all rows `UNPROVEN`: a safe future adapter may consume structured fork/base/draft/commit-count/title/body/check evidence, but it should still fail closed for process steps that GitHub's public history does not expose.

No Azure-specific lexical shortcut should be added. Any improvement must be based on generic structured PR provenance that can be regression-tested across repositories.
