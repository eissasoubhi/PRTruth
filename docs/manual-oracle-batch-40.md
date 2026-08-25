# Manual oracle batch 40 — merged PR with no CI lint step

Target: `AudioBitsStellar/AudioBlocks_Frontend_v1` issue #236 / PR #347.

## Why this case matters

The issue has five explicit acceptance criteria for consolidating two conflicting ESLint configurations. The merged PR claims all five are satisfied, including `npm run lint` passing and a criterion that the CI lint step uses the same config. However, the repository's exact PR-head GitHub Actions run contains only a coverage job, and that run failed in `npm run test:coverage`. There is no CI lint step at all.

This case therefore separates four different evidence shapes that must not be conflated:

- repository-state facts visible in the diff;
- self-reported local command results in the PR body;
- exact-head GitHub Actions execution;
- merged/closed lifecycle state.

## Independent oracle

| Acceptance criterion | Human verdict | Evidence / rationale |
| --- | --- | --- |
| Only `eslint.config.mjs` remains | PROVEN | The PR deletes `.eslintrc.json` and retains the flat config. |
| All rules from the legacy config are preserved in the flat config | PROVEN | The flat config adds the Prettier recommended flat-config integration that represented the legacy config's unique rule source; the PR leaves the existing modern rules in place. |
| `npm run lint` passes consistently | UNPROVEN | The PR author reports a local exit 0, but the exact-head CI does not execute lint. Self-reported local execution is supporting evidence, not authoritative execution proof. |
| No duplicate or conflicting rules | PROVEN | The duplicate legacy config is removed and the remaining flat configuration contains the consolidated rule sources. This is a source/configuration-state judgment, not a generic green-CI inference. |
| CI lint step uses the same config | FAILED | No CI lint step exists. The only exact-head workflow job is coverage, and its `npm run test:coverage` step fails. A nonexistent CI lint step cannot satisfy the original criterion even if maintainers accept the deviation. |

Human issue-level verdict: **FAILED** because one explicit acceptance criterion is factually unsatisfied and one command-execution criterion lacks authoritative evidence.

## Exact-head CI

PR head: `ed9400cb49910c185d9ad19dc226e59de7e9221d`.

GitHub exposes one PR-triggered workflow run named `test`, conclusion `failure`. Its only job is `coverage`; `npm ci` succeeds, `npm run test:coverage` fails, and no lint command or lint job is present.

This failure is not itself evidence that `npm run lint` fails; it is a separate coverage failure. Conversely, a merged PR and an author statement that lint passed locally are not evidence that CI lint exists.

## Expected PRTruth behavior

PRTruth should extract exactly the five explicit acceptance criteria. It must remain fail-closed on the two execution-sensitive criteria:

- author-reported local `npm run lint` must not become exact-head execution proof;
- a nonexistent CI lint step must never become `PROVEN` from merge state, issue closure, or unrelated CI.

No AudioBlocks-specific verifier rule is justified by this case. If PRTruth cannot deterministically prove or fail a criterion from supported evidence, `UNPROVEN` remains preferable to lexical inference.
