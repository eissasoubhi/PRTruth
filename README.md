# PRTruth

**Your agent says it’s done. Check the evidence.**

PRTruth verifies whether an existing GitHub pull request actually proves the requirements of the issue it claims to solve.

PRTruth starts from artifacts teams already have: a GitHub issue, a pull request and its diff, CI results, and repository instructions such as `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`.

It reports three deliberately strict outcomes:

- **PROVEN** — concrete supporting evidence exists;
- **FAILED** — evidence contradicts the requirement or a required check failed;
- **UNPROVEN** — there is not enough evidence to justify success.

> PRTruth does not ask “did the agent say it finished?” It asks “what can we prove from the repository?”

## Quick start

```bash
npx prtruth verify --issue 148 --pr 152
```

```text
Requirement                         Result
────────────────────────────────────────────
Export endpoint exists             ✓ PROVEN
Admin authentication               ✓ PROVEN
Maximum 10,000 records             ⚠ UNPROVEN
No breaking changes                ⚠ UNPROVEN
Tests pass                         ✓ PROVEN

Verdict: NOT PROVEN
3 / 5 requirements verified
```

PRTruth reads the issue and pull request, extracts acceptance criteria and completion claims, inspects changed files and CI/check results, discovers repository instruction files, and renders terminal, Markdown, and JSON evidence reports.

### Keep one evidence comment on the pull request

Pass `--comment` to publish the Markdown verification report back to the pull request:

```bash
GITHUB_TOKEN=... npx prtruth verify --issue 148 --pr 152 --comment
```

PRTruth marks its comment with a hidden identifier. Re-running the command updates the existing PRTruth comment instead of adding another one, including on pull requests with more than 100 comments. Comment publishing requires a GitHub token with permission to write pull-request issue comments.

## README badge

Generate a Markdown badge from a verification result:

```bash
npx prtruth verify --issue 148 --pr 152 --format badge
```

Example output:

```markdown
[![PRTruth: PROVEN](https://img.shields.io/badge/PRTruth-PROVEN-brightgreen)](https://github.com/owner/repository)
```

The badge reflects the same verification verdict as the normal report: `PROVEN`, `FAILED`, or `NOT PROVEN`. The `--policy` option controls process exit behavior independently from the rendered verdict.

## What v0.1.0 includes

- Evidence-based acceptance-criteria verification.
- Completion-claim fact checking with concrete explanations.
- GitHub Action and idempotent pull-request comments.
- Terminal, Markdown, JSON, and badge output.
- JavaScript/TypeScript, PHPUnit/PHP, pytest/Python, Go, API/schema, and security/static-analysis evidence adapters.
- Agent-session evidence adapters for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode.
- Signed and hash-addressed receipts, evidence plugins, and historical comparison.

## Principles

- Evidence over confidence.
- Zero-config first.
- Vendor-neutral.
- Local/open source.
- Deterministic where possible.

## Roadmap

The current implementation roadmap is tracked in [`ROADMAP.md`](ROADMAP.md).

## Development

Node.js 22+ and TypeScript.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
