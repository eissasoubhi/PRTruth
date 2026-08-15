# PRTruth Roadmap

PRTruth verifies what an existing pull request can actually prove from artifacts teams already have.

The roadmap prioritizes **zero-config evidence discovery** before agent-specific integrations.

## v0.1 — Evidence CLI

- [x] Issue acceptance-criteria extraction
- [x] Pull-request changed-file inspection
- [x] GitHub check-run inspection
- [x] `PROVEN` / `FAILED` / `UNPROVEN` semantics
- [x] Terminal and Markdown reports
- [x] Versioned machine-readable verification receipt
- [x] Repository instruction discovery (`AGENTS.md`, `CLAUDE.md`, etc.)
- [x] Better pagination and GitHub API error handling
- [x] Fixture-driven verification tests

## v0.2 — Pull-request integration

- [x] GitHub Action
- [x] Idempotent PR evidence comment
- [x] Summary in GitHub Actions job output
- [x] Configurable merge gate for failed/unproven requirements
- [x] README verification badge

## v0.3 — Claim fact-checking

- [x] Extract completion claims from PR descriptions
- [x] Match extracted claims to deterministic evidence in the final verification report
- [ ] Flag unsupported claims such as “all tests pass” or “no breaking changes” in the final verification report
- [ ] Explain why a claim is `PROVEN`, `FAILED`, or `UNPROVEN` in user-facing output

The reusable CI-backed claim rule engine is already implemented; the remaining v0.3 work is the integration and reporting layer.

## v0.4 — Evidence adapters

- [x] JavaScript/TypeScript test evidence
- [x] PHPUnit/PHP evidence
- [x] Python/pytest evidence
- [x] Go test evidence
- [x] API/schema compatibility evidence
- [x] Security/static-analysis evidence

## Later

- [x] Agent session adapters for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode
- [x] Signed and hash-addressed verification receipts
- [x] Reusable evidence plugin contract
- [x] Historical verification comparison between commits

## Non-goals

PRTruth is not intended to become:

- another coding agent;
- an agent orchestrator;
- a generic code-review chatbot;
- a replacement for tests or CI;
- a system that turns weak heuristics into false certainty.
