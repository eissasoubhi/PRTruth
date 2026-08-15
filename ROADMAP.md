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
- [ ] Wire extracted claims to deterministic evidence in the final verification report
- [x] Flag unsupported claims such as “all tests pass” or “no breaking changes” conservatively
- [ ] Explain claim verdicts directly in the final report

## v0.4 — Evidence adapters

- [x] JavaScript/TypeScript test evidence
- [x] PHPUnit/PHP evidence
- [x] Python/pytest evidence
- [x] Go test evidence
- [x] API/schema compatibility evidence
- [x] Security/static-analysis evidence

## Later — implemented primitives

- [x] Agent session adapters for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode
- [x] Signed and hash-addressed verification receipt primitives
- [x] Reusable evidence plugin contract
- [x] Historical verification comparison between commits

## Next consolidation target

Finish the remaining v0.3 integration before expanding the product surface:

- connect extracted PR completion claims to the claim-evidence rules;
- include claim verdicts and concrete reasons in terminal, Markdown, and machine-readable reports;
- add fixture-driven coverage for `PROVEN`, `FAILED`, and `UNPROVEN` claim outcomes;
- keep broad compatibility/regression claims `UNPROVEN` unless stronger deterministic evidence exists.

## Non-goals

PRTruth is not intended to become:

- another coding agent;
- an agent orchestrator;
- a generic code-review chatbot;
- a replacement for tests or CI;
- a system that turns weak heuristics into false certainty.
