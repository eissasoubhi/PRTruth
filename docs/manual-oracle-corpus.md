# Independent public oracle corpus

PRTruth is validated against real public pull requests with an independent human oracle. The goal is not to make PRTruth agree with a reviewer at any cost. The goal is to distinguish real verifier defects from evidence that the current deterministic model cannot safely consume yet.

## Protocol

For every case:

1. Run the current PRTruth source in `report-only` mode and retain the JSON report.
2. Independently read the issue, PR body, changed files, exact-head GitHub checks/jobs/steps and logs when needed.
3. Review relevant dependency semantics when the implementation delegates the requirement to a pinned dependency.
4. Assign an independent factual assessment per requirement and completion claim without using PRTruth's verdict as the oracle.
5. Compare the two results and classify every disagreement.
6. Change PRTruth only when the missing proof can be represented by concrete reproducible evidence. Add regression coverage first or with the fix.
7. Never weaken a generic evidence gate just to make one real-world example pass.

Disagreement classes used below:

- **verifier defect** — PRTruth already has, or can safely ingest, deterministic evidence but reaches the wrong status;
- **requirement-extraction defect** — PRTruth verifies the wrong text because issue boilerplate was mistaken for requirements;
- **missing deterministic adapter** — the implementation appears correct to a human reviewer, but PRTruth has no sound evidence adapter for that semantic yet; retaining `UNPROVEN` is safer than guessing;
- **status-model gap** — the issue explicitly resolves a criterion in a way such as a justified waiver that is not equivalent to `PROVEN`, `FAILED`, or ordinary `UNPROVEN`;
- **human/issue failure** — observable evidence shows the requirement is not actually satisfied.

## Batch 1 — 2026-08-23

Batch 1 established the corpus with `eissasoubhi/ai-saas-factory`, `Itqan-community/RATQ`, `yourcove/cove`, and `homeofe/AAHP`. It found safe generic fixes for acceptance-section boundaries and structured runner labels, while retaining conservative `UNPROVEN` for arbitrary framework semantics and explicit waivers.

## Batch 2 — 2026-08-23

Batch 2 added Go and PHP/WordPress cases. It established bounded `Recommended change` / `Proposed change` sections as legitimate issue intent when stronger acceptance sections are absent, and recorded structured policy checks plus pre-existing implementation as evidence/model gaps rather than weakening proof rules.

## Batch 12 — 2026-08-24

### `watt-mind/factory` issue #1004 / PR #1006 — JavaScript security dispatch

The issue has three explicit acceptance criteria around a claim-time authorization gate: operator-sourced security dispatch must pass `operatorAuthorized`, chain/schedule dispatch must remain unauthorized, and focused tests must prove both sides. PR #1006 merged into `develop` on 2026-08-23.

Independent inspection of the issue, PR patch, exact-head workflows and CI logs supports **3/3 PROVEN factually**:

| Requirement | Independent assessment | Classification |
| --- | --- | --- |
| Claim-time eligibility receives `operatorAuthorized` from the run source | `PROVEN`: the implementation changes the worker claim-time gate and the exact-head test suite exercises the operator path | missing deterministic JS source/test-semantic adapter if PRTruth remains `UNPROVEN`; do not infer arbitrary authorization semantics lexically |
| Chain/schedule-sourced runs remain unauthorized | `PROVEN`: focused negative-path coverage is present; the security invariant is explicitly tested rather than inferred from a green workflow | missing deterministic negative-test association adapter |
| Operator security claim proceeds while chain security claim refuses | `PROVEN`: exact-head `Fast unit tests` is green and its log contains the focused test `claim-time dispatch gate honors only operator-sourced security runs (GH-1004)`; the broader dispatch suite also contains `operator-sourced dispatch proceeds past the claim-time security recheck (operatorAuthorized)` | strong structured execution evidence exists, but mapping an arbitrary test name to a prose requirement still needs a principled adapter |

Exact PR-head workflows are not merely globally green: `CI` and `Security` both succeeded. The `CI` workflow's `Fast unit tests` job ran **1552 passing tests, 9 skipped, 0 failed**, and the log names the GH-1004 regression directly. `Browser E2E` was skipped and is unrelated to these server-side dispatch requirements; this case therefore also guards against treating a skipped unrelated workflow as negative requirement evidence.

The PR patch contains two large `.bak-wm1006` configuration files unrelated to the issue's owned paths. They do not negate the three functional criteria, but they are useful scope-hygiene evidence: factual requirement satisfaction and PR cleanliness/reviewability are separate dimensions. PRTruth should not turn an unrelated-file smell into `FAILED` for a satisfied authorization requirement unless the issue explicitly makes scope cleanliness a criterion.

No verifier change is justified from this case alone. The valuable future adapter is a deterministic link from an explicit verification command / exact test identity to exact-head test execution, with adversarial protection against coincidental name similarity.

## Expansion rules

Future batches should deliberately add:

- successful and failing CI claims;
- JavaScript/TypeScript, PHP, Python, Go, .NET and Java projects;
- GitHub Actions matrix/scoped runners;
- documentation-only requirements;
- API/schema compatibility claims;
- security/static-analysis evidence;
- explicit waivers/follow-ups;
- issues with no acceptance heading, issue-template boilerplate and nested Markdown;
- third-party repositories not controlled by the PRTruth maintainer.

A batch is useful even when PRTruth remains `UNPROVEN`: the comparison records whether that is a correct conservative ceiling or a concrete fixable miss.
