# Changelog

All notable changes to PRTruth are documented in this file.

## 0.1.8

Evidence semantics and release-distribution reliability patch.

### Fixed

- Validation text that reports a failure such as `tests failed` is no longer extracted as a positive completion claim and then misleadingly fact-checked as though it claimed success.
- npm publication no longer races GitHub release creation on every push to `main`; automatic npm publication now starts from the published GitHub release event, with manual tag-based recovery still available.
- Manual GitHub release dispatches are rejected when launched from a branch other than `main`, preventing an unintended branch commit from becoming a version tag solely because its package version matches.

### Reliability and security

- GitHub release creation remains split between read-only validation and a narrowly scoped `contents: write` publishing job.
- Release and npm workflows keep checkout credentials non-persistent.
- The `ai` npm discovery keyword remains unchanged.

## 0.1.7

Evidence clarity, discoverability, and workflow hardening release.

### Improved

- Requirements with explicit retry/attempt quantities can surface a `Possible quantitative mismatch` when a semantically relevant added patch line exposes a different quantity.
- Quantitative patch mismatches remain `UNPROVEN` reviewer-navigation evidence rather than being promoted to `FAILED` when retry-versus-attempt semantics may still be ambiguous.
- Retry total parsing now prefers explicit total forms such as `attempt <current> of <total>` and `<current>/<total>`, and no longer treats a bare current counter such as `attempt 1` as the configured retry total.
- README now explains common use cases for AI pull request verification, acceptance-criteria verification, GitHub Actions merge gates, CI claim fact-checking, and audit receipts.
- Added a concise PRTruth-vs-CI-vs-AI-code-review comparison and FAQ to make the product boundary easier to understand and improve relevant search discoverability.

### Security

- Read-only CI and local Action-smoke checkouts no longer persist the GitHub checkout credential in repository Git configuration.
- Release and npm-publish checkouts also disable persisted checkout credentials while retaining their explicit workflow permissions.
- Regression tests enforce the expected checkout credential behavior and permission boundaries.

### Verification

- Quantitative mismatch behavior is covered by regression tests for mismatching totals, matching totals, `current of total` forms, bare current counters, and unrelated numeric changes.
- The GitHub Action smoke remained green after checkout credential hardening and directly exercised public `prtruth@0.1.6` from npm.
- The `ai` npm discovery keyword remains unchanged.

## 0.1.6

GitHub Action corrective release.

### Fixed

- `action.yml` is now valid for GitHub's real Action manifest parser; descriptions containing `:` are quoted correctly.
- The composite Action no longer installs the full development dependency tree and recompiles TypeScript on every consumer pull request.
- The Action executes the exact published `prtruth@<version>` associated with its tag from a neutral temporary directory, preventing collisions with a caller workspace that also contains a package named `prtruth`.
- Runtime npm execution ignores authenticated user configuration and disables package lifecycle scripts, audit, and funding network extras.

### Verification

- Added a real GitHub Action integration smoke using `uses: ./`, so Action-manifest parsing and runtime execution are exercised by GitHub rather than checked only as text.
- The integration smoke confirmed that public `prtruth@0.1.5` was installable and executable before this corrective release.

### Documentation

- Public usage examples are repository-neutral rather than tied to a project-specific repository.
- GitHub Action examples now point to `v0.1.6`.

## 0.1.5

Evidence integrity and reviewer-navigation release.

### Added

- `UNPROVEN` requirements can surface a small set of relevant **added patch lines** with file and line references, helping reviewers find candidate evidence without treating textual similarity as proof.
- Real JobPilot dogfooding now exposes implementation details such as `COMPOSER_MAX_PARALLEL_HTTP: 1`, cache reuse, and the actual retry counter while preserving conservative verdicts.

### Reliability

- GitHub check runs are now paginated beyond the first 100 results.
- Workflow runs are paginated before selecting the latest run for each workflow.
- Jobs inside selected workflow runs are paginated, preventing page-2 failures from disappearing from the evidence set.
- Regression tests cover a 101st failing check, a latest workflow run on page 2, and a 101st failing workflow job.

### Distribution

- npm publication now verifies the exact public `name@version` after publish, retries registry propagation, and executes the released CLI from a clean temporary directory.
- Consumer verification explicitly ignores authenticated npm configuration so a successful smoke proves public installability rather than access through the publish token.
- Real-project dogfood now runs the exact-version npm smoke on workflow-change pull requests as well as scheduled/manual runs.
- `prtruth@0.1.4` was successfully exercised by that unauthenticated npm smoke before this release.

### Safety

- Patch-text matches remain `UNPROVEN`; they are navigation evidence only and never upgrade a requirement to `PROVEN` by themselves.
- The `ai` discovery keyword remains part of the npm package metadata.

## 0.1.4

Whole-CI evidence hardening release.

### Fixed

- Generic claims such as `CI is green` or `Full CI completes successfully` now use top-level GitHub checks instead of being left `UNPROVEN` when decisive CI evidence exists.
- An observed top-level CI failure, cancellation, timeout, action-required state, or startup failure now makes a whole-CI success claim `FAILED`.
- Skipped or otherwise non-successful top-level checks do not become false `PROVEN` results.
- Step-level evidence remains available for specific install/test/lint/typecheck/build claims and is not allowed to hide a failed top-level job.

### Dogfooding

- Added public `eissasoubhi/jobpilot` issue #6 / PR #5 to the recurring real-project suite.
- The JobPilot case exposed the false negative above: `Backend tests` was failed while a `Full GitHub-hosted CI must pass` claim was only `UNPROVEN` before this fix.
- The suite keeps the separate `no validation gate was removed or weakened` requirement `UNPROVEN`, preserving the boundary between CI status and stronger process evidence.

## 0.1.3

GitHub Actions adoption release.

### Added

- Pull requests can infer their verification issue from a single GitHub closing reference such as `Fixes #123`, `Closes #123`, or `Resolves #123` when `--issue` is omitted.
- The GitHub Action exposes verification policy, optional PR comments, and GitHub Actions job summaries.
- A copy-paste GitHub Actions guide documents minimal read permissions, non-blocking evaluation, strict merge gates, comments, and explicit issue selection.

### Safety

- Automatic issue inference refuses to guess when a PR closes no issue or several issues; callers must pass `--issue` explicitly in those cases.
- The evidence model remains deterministic-first. Issue inference only chooses the verification target and does not increase proof strength.

## 0.1.2

Real-project verification hardening release.

### Improved

- `UNPROVEN` business claims can now show relevant changed files as candidate evidence without treating filename relevance as proof.
- Real-project dogfooding runs weekly against public issue/PR histories and stores JSON verification reports as workflow artifacts.
- The dogfood workflow validates the published npm package and CLI version from a neutral temporary directory.

### Fixed

- Specific test-coverage claims such as `tests for signatures, replay tolerance, ...` are no longer marked `PROVEN` solely because a generic test command succeeded.
- Specific coverage claims remain `UNPROVEN` until PRTruth can deterministically show that the named behaviors are exercised, while relevant changed test files can still be displayed as evidence candidates.
- Scoped compatibility claims such as `No breaking API changes` and `No breaking schema changes` now keep the stronger compatibility-evidence safeguard instead of falling back to filename heuristics.

## 0.1.1

Dogfooding and discoverability release.

### Improved

- GitHub Actions step-level evidence is collected from the latest run of each workflow for a PR head, so generic jobs such as `quality` can still prove observed install/lint/typecheck/test/build stages.
- Composite CI validation claims can be checked across multiple successful workflow steps.
- Issue requirements are treated more conservatively: mentioning tests is no longer enough to turn a broad coverage requirement into a simple CI-pass proof.
- Pull-request claim extraction now understands common `Included` sections and high-confidence validation prose.
- README and technical documentation explain the evidence model, limitations, and the distinction between PRTruth, normal CI, and AI code-review tools more clearly.
- npm description and discovery keywords now cover pull-request verification, acceptance criteria, GitHub Actions, CI, developer tools, and coding agents while keeping the `ai` keyword.

### Fixed

- `prtruth --version` now reads the package version instead of reporting the stale hard-coded `0.0.0` value.
- CI now smoke-tests the built CLI version against `package.json`.

## 0.1.0

Initial public release.

### Added

- Evidence-based verification of issue acceptance criteria against pull-request artifacts.
- Strict `PROVEN`, `FAILED`, and `UNPROVEN` semantics.
- Completion-claim extraction and deterministic claim fact checking.
- Human-readable terminal and Markdown reports plus versioned JSON receipts.
- GitHub Action integration, idempotent pull-request evidence comments, job summaries, and configurable merge-gate behavior.
- Repository-instruction discovery for files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `CONTRIBUTING.md`.
- Evidence adapters for JavaScript/TypeScript, PHPUnit/PHP, pytest/Python, Go, API/schema compatibility, and security/static analysis.
- Agent-session evidence adapters for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode.
- Reusable evidence-plugin contract, signed and hash-addressed receipts, and historical verification comparison.

### Reliability

- Paginated GitHub API reads for large pull requests and comment threads.
- Actionable GitHub API error handling.
- Fixture-driven verification coverage and focused adapter/report tests.
