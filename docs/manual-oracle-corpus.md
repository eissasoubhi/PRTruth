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

### `eissasoubhi/ai-saas-factory` issue #1 / PR #3

Published/current baseline before fixes: `0 / 4` requirements proven, overall `NOT_PROVEN`. The PR's Linux ARM64 CI completion claim was also `UNPROVEN`.

| Requirement / claim | Independent assessment | Baseline PRTruth | Classification |
| --- | --- | --- | --- |
| Server-side authorization for organization-scoped operations | `PROVEN` factually: protected server components validate the session and organization path; the pinned Better Auth server endpoint enforces organization membership/permission | `UNPROVEN` | missing deterministic dependency/domain adapter; do not add a text heuristic |
| Single-use expiring invitations | `PROVEN` factually: 48h expiry is configured and the pinned Better Auth implementation checks expiry/pending state and atomically transitions pending → accepted | `UNPROVEN` | missing deterministic dependency/domain adapter; do not add a text heuristic |
| Automated tests for core identity/workspace flows | `FAILED`: the exact PR CI log says `No test files found, exiting with code 0` for `@factory/web`; the script uses `vitest run --passWithNoTests` | `UNPROVEN` | verifier evidence gap: job success alone hides zero-test execution; needs trustworthy test/log evidence before changing status |
| Environment variables and local setup documented | `PROVEN`: `.env.example` documents runtime/auth/email/provider variables and README contains executable local setup steps | `UNPROVEN` | missing deterministic documentation adapter |
| `Self-hosted Linux ARM64 CI passes install, lint, typecheck, tests and production build` | `PROVEN`: exact PR-head workflow job is labeled `self-hosted`, `Linux`, `ARM64`; all named steps completed successfully | `UNPROVEN` | **verifier defect**: structured GitHub job labels were discarded |

Human issue-level assessment: **FAILED** because the explicit automated identity/workspace test requirement is observably unsatisfied, despite three other requirements being factually satisfied.

The scoped CI defect is fixed separately by propagating GitHub's structured workflow-job labels into step evidence. The regression must prove the scoped CI claim without proving the unrelated broad test-coverage requirement.

### `Itqan-community/RATQ` issue #151 / PR #254

The issue has six explicit security acceptance criteria covering anonymous access, owner access, admin access, cross-user draft isolation, comment visibility and tests covering the matrix. The PR changes Payload access functions and adds focused Resources/Comments tests for those cases.

Initial PRTruth extraction produced **15** requirements because it mixed the issue's `Scope` and generic `Contributor Checklist` boxes into the actual acceptance criteria. After the section-boundary fix, the corpus produces exactly the six explicit acceptance criteria.

| Area | Independent assessment | PRTruth after extraction fix | Classification |
| --- | --- | --- | --- |
| Six acceptance criteria selected | correct set is exactly 6 | exactly 6 | extraction defect fixed |
| Payload access-control behavior | implementation review supports the intended access matrix | `UNPROVEN` | missing deterministic Payload/domain adapter; conservative result retained |
| Tests cover the five access cases | focused test code exists for anonymous, owner, other authenticated user and admin paths across resources/comments | `UNPROVEN` | missing deterministic test-coverage adapter; do not infer semantic coverage from filenames alone |

No generic semantic rule is added for this case. The useful fix is the extraction boundary, not pretending PRTruth understands arbitrary Payload access functions.

### `yourcove/cove` issue #454 / PR #455

The bug report uses bold issue-template labels (`**To Reproduce**`, `**Expected behavior**`) instead of ATX headings. The expected behavior requires whole-library transfer operations to enforce all implied content scopes and configuration-backup discovery to use its dedicated backup permission.

The PR adds explicit authorization attributes for read/write/delete scopes, changes backup discovery to the dedicated permission and adds focused API authorization regression tests. Exact-head CI succeeded, including backend and API-test jobs.

Initial PRTruth extraction incorrectly treated numbered reproduction steps as requirements. After the extraction fix, it selects one requirement: the actual `Expected behavior` paragraph.

| Area | Independent assessment | PRTruth after extraction fix | Classification |
| --- | --- | --- | --- |
| Requirement selected | expected-behavior paragraph | exact expected-behavior paragraph | extraction defect fixed |
| Authorization implementation | human review plus focused API tests and green exact-head CI support the requested behavior | `UNPROVEN` | missing deterministic .NET authorization/test-semantic adapter; conservative result retained |

Again, the safe improvement is correct issue intent extraction. Turning this into `PROVEN` requires a domain-aware deterministic adapter rather than lexical similarity.

### `homeofe/AAHP` issue #45 / PR #49

The issue contains seven explicit acceptance criteria. Six are completed with evidence notes. One criterion is intentionally left unresolved in the issue and carries a detailed `(waived: ...)` rationale because the project deliberately demoted heuristic Markdown detection from a gate to an advisory report after adversarial testing found unsound blind spots.

Exact-head AAHP CI is green and includes the Bats test suite.

PRTruth correctly extracts all seven acceptance criteria but currently reports all seven `UNPROVEN`.

| Area | Independent assessment | PRTruth | Classification |
| --- | --- | --- | --- |
| Six evidence-backed criteria | implementation/documentation/test review supports completion | `UNPROVEN` | mostly missing project-specific documentation/tooling semantics |
| Explicitly waived criterion | **WAIVED**, not factual `PROVEN` and not an implementation failure under the issue's own lifecycle | `UNPROVEN` | **status-model gap**: justified resolution is distinct from lack of evidence |

This case should not be "fixed" by treating checked boxes or the word `waived` as proof. It is a design case for explicit requirement-resolution metadata/status semantics.

## Batch 1 findings

The first batch already found three distinct classes of improvement:

1. **Issue-intent extraction** — explicit acceptance sections must be authoritative; contributor checklists and reproduction steps are not requirements. Bold issue-template section labels must be understood. This is a safe general parser fix and has regression coverage.
2. **Structured runner scope** — GitHub workflow job labels are deterministic metadata and can safely prove Linux/ARM64 scope for step evidence. This is a safe evidence-ingestion fix with a real-world regression oracle.
3. **Evidence/model gaps that must remain conservative for now** — arbitrary framework authorization semantics, dependency behavior, exact business-flow test coverage, and justified waivers need dedicated evidence or status models. They must not be papered over with keyword matching.

## Batch 2 — 2026-08-23

### `Shevanio/shevanio-ai` issue #11 / PR #12 — Go

The issue defines four explicit acceptance criteria spanning documentation, a PowerShell installer invariant, focused tests and a review-size policy. PRTruth selects the correct four criteria but reports all four `UNPROVEN`.

The independent review found strong concrete evidence for all four:

| Requirement | Independent assessment | PRTruth | Classification |
| --- | --- | --- | --- |
| No prerelease publication claims remain in the secondary installation guides | `PROVEN`: the PR diff removes the old “not published / future formula” guidance and replaces it with the stable v2.5.0 Homebrew, Go and upgrade paths | `UNPROVEN` | missing deterministic documentation/diff adapter |
| PowerShell installer uses the `Shevanio` owner without changing stable `@latest` policy | `PROVEN`: the installer patch changes only the owner constant from `Gentleman-Programming` to `Shevanio`; a focused Go regression test asserts the canonical module and stable `@latest` command | `UNPROVEN` | missing deterministic source-invariant adapter |
| Focused installer and documented-invocation tests pass | `PROVEN`: focused regression tests are added, and exact-head CI has a successful `Unit Tests` job plus successful platform/runtime jobs | `UNPROVEN` | missing deterministic association between the requirement and the relevant test suite |
| Authored change remains within the 400-line review budget | `PROVEN`: exact-head PR Validation contains the structured successful step `Check PR Cognitive Load / Verify PR stays within review budget` | `UNPROVEN` | evidence-adapter gap: GitHub has a direct policy check, but PRTruth does not yet safely map arbitrary policy-step names to prose requirements |

Human issue-level assessment: **PROVEN (4/4)**.

This case is deliberately **not** fixed with fuzzy name matching. The review-budget check is promising structured evidence, but a generic step-name entailment rule needs a principled design and adversarial tests before it can become proof.

### `nilesh32236/performance-optimisation` issue #601 / PR #645 — PHP / WordPress

The issue does not have an `Acceptance criteria` section. Its actual requested scope is an explicit `Recommended change (one scope)` section with three numbered items. It then separately lists backward-compatibility notes and verification instructions.

Baseline PRTruth incorrectly extracted **8 requirements**: the three requested changes plus three backward-compatibility bullets and two verification bullets. The batch exposed this as a second cross-project issue-intent boundary defect.

The extractor now recognizes bounded `Recommended change` / `Proposed change` sections when stronger `Acceptance criteria` or `Expected behavior` sections are absent. The real corpus rerun selects exactly the intended three requirements. Regression tests also ensure formal acceptance criteria remain authoritative if both forms exist.

| Requirement / area | Independent assessment | PRTruth after extraction fix | Classification |
| --- | --- | --- | --- |
| Requirement set | exactly the three numbered items under `Recommended change (one scope)` | exactly 3 | **requirement-extraction defect fixed** |
| Apply per-size quality during batch conversion | the PR states this was already shipped before #645; this PR does not modify that implementation | `UNPROVEN` | conservative ceiling is appropriate for this PR history; prior work is not automatically proof for the current PR |
| Skip gain-map HDR sources | `PROVEN` factually by the patch: it adds bounded UltraHDR marker detection, skips re-encoding and records `skipped`; a focused regression test is added; exact-head PHP CI and security/style scans are green | `UNPROVEN` | missing deterministic PHP/domain + test-semantic adapter; do not infer the behavior from keywords alone |
| Honor `image_editor_output_format` consistently | the PR states this was already shipped before #645 and does not modify that implementation | `UNPROVEN` | conservative ceiling is appropriate for this PR history |

A separate AI-review workflow on the exact head failed while the repository's actual `CI — JS & PHP` and `WPCS & Psalm Security Scan` workflows succeeded. The oracle therefore also guards against treating every unrelated check failure as proof that one of these three product requirements failed.

## Batch 2 findings

1. **Recommended/proposed change sections are legitimate issue intent in some projects.** They should be bounded like acceptance sections, not mixed with later compatibility/testing lists. This is a safe parser improvement backed by a real PHP issue and regression tests.
2. **Structured policy checks are an important future evidence source.** The Shevanio review-budget criterion has a direct successful GitHub step, but generic prose-to-step mapping is not yet safe enough to promote to `PROVEN` automatically.
3. **Historical/prior implementation must not be smuggled into current-PR proof.** The PHP issue explicitly says two of three points were already shipped. PRTruth staying `UNPROVEN` for those points is preferable to treating the PR author's statement as proof.
4. **A green relevant CI and a failed unrelated workflow can coexist.** Requirement verdicts must stay tied to relevant evidence rather than collapse all repository automation into one boolean.

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
