# Changelog

All notable changes to PRTruth are documented in this file.

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
