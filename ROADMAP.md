# PRTruth Roadmap

PRTruth verifies what an existing pull request can actually prove from artifacts teams already have.

The roadmap prioritizes **zero-config evidence discovery** before agent-specific integrations.

## v0.1 — Evidence CLI

- [x] Issue acceptance-criteria extraction
- [x] Pull-request changed-file inspection
- [x] GitHub check-run inspection
- [x] `PROVEN` / `FAILED` / `UNPROVEN` semantics
- [x] Terminal and Markdown reports
- [ ] Versioned machine-readable verification receipt
- [ ] Repository instruction discovery (`AGENTS.md`, `CLAUDE.md`, etc.)
- [ ] Better pagination and GitHub API error handling
- [ ] Fixture-driven verification tests

## v0.2 — Pull-request integration

- [ ] GitHub Action
- [ ] Idempotent PR evidence comment
- [ ] Summary in GitHub Actions job output
- [ ] Configurable merge gate for failed/unproven requirements
- [ ] README verification badge

## v0.3 — Claim fact-checking

- [ ] Extract completion claims from PR descriptions
- [ ] Match claims to deterministic evidence
- [ ] Flag unsupported claims such as “all tests pass” or “no breaking changes”
- [ ] Explain why a claim is `PROVEN`, `FAILED`, or `UNPROVEN`

## v0.4 — Evidence adapters

- [ ] JavaScript/TypeScript test evidence
- [ ] PHPUnit/PHP evidence
- [ ] Python/pytest evidence
- [ ] Go test evidence
- [ ] API/schema compatibility evidence
- [ ] Security/static-analysis evidence

## Later

- Agent session adapters for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode
- Signed or hash-addressed verification receipts
- Reusable evidence plugins
- Historical verification comparison between commits

## Non-goals

PRTruth is not intended to become:

- another coding agent;
- an agent orchestrator;
- a generic code-review chatbot;
- a replacement for tests or CI;
- a system that turns weak heuristics into false certainty.
