# Changelog

All notable changes to PRTruth are documented in this file.

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
