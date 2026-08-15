# PRTruth

**Your agent says it’s done. Check the evidence.**

PRTruth verifies whether an existing GitHub pull request actually proves the requirements of the issue it claims to solve.

PRTruth starts from artifacts teams already have: a GitHub issue, a pull request and its diff, CI results, and repository instructions such as `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`.

It reports three deliberately strict outcomes:

- **PROVEN** — concrete supporting evidence exists;
- **FAILED** — evidence contradicts the requirement or a required check failed;
- **UNPROVEN** — there is not enough evidence to justify success.

> PRTruth does not ask “did the agent say it finished?” It asks “what can we prove from the repository?”

## v0.1

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

The first release will read the issue and PR, extract acceptance criteria and completion claims, inspect changed files and CI/check results, discover repository instruction files, and render terminal, Markdown, and JSON evidence reports.

### Keep one evidence comment on the pull request

Pass `--comment` to publish the Markdown verification report back to the pull request:

```bash
GITHUB_TOKEN=... npx prtruth verify --issue 148 --pr 152 --comment
```

PRTruth marks its comment with a hidden identifier. Re-running the command updates the existing PRTruth comment instead of adding another one, including on pull requests with more than 100 comments. Comment publishing requires a GitHub token with permission to write pull-request issue comments.

## Principles

- Evidence over confidence.
- Zero-config first.
- Vendor-neutral.
- Local/open source.
- Deterministic where possible.

## Roadmap

- **v0.1:** CLI evidence engine
- **v0.2:** GitHub Action and PR evidence comment
- **v0.3:** agent/PR claim fact-checking

## Development

Node.js 22+ and TypeScript.

```bash
pnpm install
pnpm test
pnpm build
```

## License

MIT
