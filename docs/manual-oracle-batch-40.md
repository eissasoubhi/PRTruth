# Manual oracle batch 40 — merged PR contradicts its checked criteria

Target: `AudioBitsStellar/AudioBlocks_Frontend_v1` issue #236 / PR #347.

## Why this case matters

The issue has five explicit acceptance criteria for consolidating two conflicting ESLint configurations. The merged PR marks all five complete and says that `.eslintrc.json` was deleted, Prettier was merged into `eslint.config.mjs`, and local `npm run lint` passed.

The exact merged head contradicts those claims. `.eslintrc.json` still exists, `eslint.config.mjs` still lacks the announced Prettier integration, and GitHub reports exactly ten changed files — all application/source formatting files, with neither ESLint config among them. The exact PR-head GitHub Actions run also has only a coverage job; `npm run test:coverage` fails and no CI lint step exists.

This case separates five evidence shapes that must not be conflated:

- checked boxes and prose in the PR body;
- exact candidate repository state;
- exact candidate diff scope;
- exact-head GitHub Actions execution;
- merged/closed lifecycle state.

## Independent oracle

| Acceptance criterion | Human verdict | Evidence / rationale |
| --- | --- | --- |
| Only `eslint.config.mjs` remains | FAILED | `.eslintrc.json` is still present at exact head `ed9400cb...`; the PR's changed-file set does not include either ESLint config. |
| All rules from the legacy config are preserved in the flat config | FAILED | The exact-head `eslint.config.mjs` still extends only `next/core-web-vitals` and `next/typescript`; the claimed `eslint-plugin-prettier/recommended` integration is absent. |
| `npm run lint` passes consistently | UNPROVEN | The PR author reports a local exit 0, but exact-head CI never executes lint. Self-reported local execution is supporting evidence, not authoritative execution proof. |
| No duplicate or conflicting rules | FAILED | Both configuration files still exist at the merged head, preserving the original duplicate-config condition. |
| CI lint step uses the same config | FAILED | No CI lint step exists. The only exact-head workflow job is coverage, and its `npm run test:coverage` step fails. |

Human issue-level verdict: **FAILED** — four of five explicit criteria are observably false at the exact merged head, while the remaining command-execution criterion lacks authoritative evidence.

## Exact-head repository evidence

PR head: `ed9400cb49910c185d9ad19dc226e59de7e9221d`.

At that SHA:

- `.eslintrc.json` still contains `next/core-web-vitals` and `plugin:prettier/recommended`;
- `eslint.config.mjs` does not contain `eslint-plugin-prettier/recommended`;
- GitHub's changed-file list contains ten application/source files and no ESLint config files.

This makes the checked acceptance table in the PR body materially inaccurate with respect to the object that was actually merged.

## Exact-head CI

GitHub exposes one PR-triggered workflow run named `test`, conclusion `failure`. Its only job is `coverage`; `npm ci` succeeds, `npm run test:coverage` fails, and no lint command or lint job is present.

That coverage failure is not itself evidence that `npm run lint` fails. Conversely, a merged PR and an author statement that lint passed locally are not evidence that lint was executed on the candidate by CI.

## Expected PRTruth behavior

PRTruth should extract exactly the five explicit acceptance criteria. Most importantly, it must never promote any of the four contradicted criteria to `PROVEN` from checked boxes, issue closure, merge state, or unrelated CI. The local lint claim must also remain non-authoritative without deterministic execution evidence.

This batch is a strong future candidate for a deterministic exact-head repository-state adapter: file existence and exact config content are objective facts that can support `FAILED` without fuzzy semantic matching. Until such an adapter is implemented safely, `UNPROVEN` is preferable to a false `PROVEN`.
