# PRTruth

**Your pull request says it is done. PRTruth checks the evidence.**

PRTruth is an open-source CLI and GitHub Action for **pull request verification**. Give it a GitHub issue and a pull request; it compares the issue's acceptance criteria with evidence from the PR, changed files and patch candidates, GitHub Actions/CI checks, repository instructions, and completion claims.

It returns deliberately strict results:

- **PROVEN** — PRTruth found concrete evidence for the requirement or claim.
- **FAILED** — the available evidence contradicts it or a required check failed.
- **UNPROVEN** — there is not enough evidence to say it is done.

PRTruth is useful when humans, AI coding agents, or automation produce PRs faster than reviewers can manually verify every completion claim.

> PRTruth does not ask “does this change look convincing?” It asks “what can this repository actually prove?”

## 60-second example

Suppose an issue says:

```text
Acceptance criteria
- Export endpoint exists
- Only admins can export
- Tests pass
- No breaking changes
```

A PR says everything is complete. Run:

```bash
npx prtruth verify --issue 148 --pr 152
```

PRTruth can report:

```text
Requirement                         Result
────────────────────────────────────────────
Export endpoint exists             ⚠ UNPROVEN
Only admins can export             ⚠ UNPROVEN
Tests pass                          ✓ PROVEN
No breaking changes                ⚠ UNPROVEN

Verdict: NOT PROVEN
```

A green test check can prove that the observed test check passed. It does **not** automatically prove authorization behavior or backward compatibility. PRTruth prefers `UNPROVEN` over inventing certainty.

When a requirement is not provable, PRTruth can still show a small number of relevant added patch lines to help the reviewer find where the implementation lives. Those lines remain **candidate evidence only** and never become `PROVEN` just because their text looks relevant.

## Why use PRTruth?

A normal CI pipeline answers questions such as **“did the tests/build/lint pass?”**. PRTruth adds another layer:

**“Do the artifacts around this PR actually support the requirements and the claims being made?”**

That is useful for:

- reviewing pull requests created by AI coding agents such as Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode;
- checking whether issue acceptance criteria have evidence before merge;
- fact-checking claims such as “tests pass”, “build passes”, or “no breaking changes”;
- creating a machine-readable verification receipt for automation and audit trails;
- keeping a strict boundary between evidence and guesses.

## Common use cases

### AI pull request verification

An AI coding agent says a task is complete. PRTruth checks the issue requirements, PR claims, changed files, patch candidates, and CI evidence before you trust the claim.

See the [AI coding-agent workflow playbook](docs/agent-workflows.md) for a practical agent → CI → PRTruth → review flow, safe policy progression, and agent-specific guidance.

### Acceptance criteria verification

An issue contains a checklist or an `Acceptance criteria` section. PRTruth turns those requirements into explicit `PROVEN`, `FAILED`, or `UNPROVEN` results so reviewers can see what still needs evidence.

### GitHub Actions merge gate

Run PRTruth on every pull request in `report-only` mode first. When the reports are useful for your team, switch to `failures-only` or `strict` to make evidence part of the merge policy.

### CI claim fact-checking

A PR description says “tests pass”, “build is green”, or “full CI succeeds”. PRTruth checks the observed GitHub checks and workflow steps rather than trusting the text in the PR description.

### Review and audit receipts

Generate JSON or Markdown evidence reports for automated review workflows, release checks, or audit trails without asking a model to invent a confidence score.

## PRTruth vs CI vs AI code review

| Tool | Best at | What it does not prove by itself |
| --- | --- | --- |
| CI | Running tests, lint, typecheck, build, security checks | That every issue requirement is satisfied |
| AI code review | Finding suspicious code, explaining changes, suggesting improvements | A deterministic proof that a completion claim is true |
| **PRTruth** | Connecting issue requirements and PR claims to observable repository evidence | Complex runtime/business behavior without a deterministic evidence source |

PRTruth is designed to **complement CI and code review**, not replace them.

## How it works

PRTruth currently follows an evidence-first, deterministic pipeline:

```text
GitHub issue
   ↓
Acceptance criteria
   ↓
Pull request ── changed files / patch lines / CI / claims / repo instructions
   ↓
Evidence matching
   ↓
PROVEN / FAILED / UNPROVEN
```

PRTruth **does not currently send your code to an LLM to decide whether it is correct**. The core verifier uses deterministic rules and structured GitHub evidence. This keeps results explainable, reproducible, and conservative.

See [How PRTruth works](docs/how-it-works.md) for the technical model and current limitations.

## Try it on a public repository

No GitHub token is required for a basic public-repository check:

```bash
npx -y prtruth@latest verify \
  --repo owner/repository \
  --issue 123 \
  --pr 456 \
  --policy report-only
```

If the pull request contains exactly one closing reference such as `Closes #123`, you can omit `--issue 123` and PRTruth will infer it automatically.

For a repository detected from your local Git remote:

```bash
npx prtruth verify --pr 152 --policy report-only
```

If the PR description contains one `Fixes #123`, `Closes #123`, or `Resolves #123` reference, PRTruth uses that issue automatically. If there is no closing reference or there are several, pass `--issue <number>` explicitly.

`report-only` is convenient for exploration because it prints the evidence report without failing the command for an `UNPROVEN` result.

## Private repositories

Set a GitHub token that can read the repository:

```bash
GITHUB_TOKEN=... npx prtruth verify \
  --repo owner/private-repo \
  --issue 148 \
  --pr 152 \
  --policy report-only
```

Do not commit the token. In GitHub Actions, use the workflow's `GITHUB_TOKEN` with only the permissions you need.

## Report formats

Terminal output is the default:

```bash
npx prtruth verify --issue 148 --pr 152
```

Other formats:

```bash
npx prtruth verify --issue 148 --pr 152 --format markdown
npx prtruth verify --issue 148 --pr 152 --format json
npx prtruth verify --issue 148 --pr 152 --format badge
```

Write the selected report to a file:

```bash
npx prtruth verify --issue 148 --pr 152 --format json --output prtruth.json
```

## Keep one evidence comment on the PR

Pass `--comment` to create or update a PRTruth Markdown report on the pull request:

```bash
GITHUB_TOKEN=... npx prtruth verify --issue 148 --pr 152 --comment
```

PRTruth uses a hidden marker so re-running the command updates its existing comment instead of creating comment spam.

## GitHub Actions

Start non-blocking, inspect the reports, then turn PRTruth into a gate when you are ready.

Create `.github/workflows/prtruth.yml`:

```yaml
name: PRTruth

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read
  issues: read
  pull-requests: read
  checks: read
  actions: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: eissasoubhi/PRTruth@v0.1.10
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

If the PR body contains exactly one closing issue reference, you do not need to configure the issue number. The Action also supports `strict`, `failures-only`, optional idempotent PR comments, and GitHub job summaries.

See the [GitHub Actions quickstart](docs/github-actions.md) for merge-gate and comment examples.

## What PRTruth can and cannot prove

PRTruth is intentionally conservative.

Good deterministic evidence includes:

- completed GitHub checks and CI steps;
- changed files and relevant added patch lines as navigation evidence;
- test, lint, typecheck, build, API/schema, and static-analysis evidence;
- repository instructions such as `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`;
- supported agent-session evidence adapters;
- signed/hash-addressed verification receipts.

Some statements need stronger evidence than a normal diff or green CI can provide. For example, “no breaking changes”, “all edge cases are covered”, or a complex business rule should remain `UNPROVEN` unless PRTruth has a deterministic adapter capable of proving them.

## FAQ

### Does PRTruth use AI to decide whether code is correct?

No. The current core verifier is deterministic. It reads structured GitHub evidence and applies explicit rules. This is intentional: PRTruth should prefer `UNPROVEN` over an AI-generated guess.

### Is PRTruth an AI code review bot?

No. It does not try to replace a reviewer or generate general review comments. Its job is narrower: verify what a pull request can actually prove about issue requirements and completion claims.

### Does green CI mean the pull request is `PROVEN`?

No. Green CI proves the checks that actually ran. A business rule, authorization requirement, compatibility claim, or edge-case claim can still remain `UNPROVEN`.

### Can PRTruth block a merge?

Yes. Use `strict` to fail on `FAILED` or `UNPROVEN`, or `failures-only` to block only when deterministic evidence explicitly contradicts a claim or requirement.

### Can PRTruth verify private repositories?

Yes, when it receives a GitHub token with the minimum read permissions needed for that repository.

## Current scope

PRTruth includes:

- acceptance-criteria extraction from GitHub issues;
- PR changed-file, patch-candidate, GitHub check, and workflow-step inspection;
- completion-claim fact checking;
- terminal, Markdown, JSON, and badge reports;
- idempotent pull-request evidence comments;
- JavaScript/TypeScript, PHPUnit/PHP, pytest/Python, Go, API/schema, and security/static-analysis evidence adapters;
- Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode session adapters;
- signed and hash-addressed receipts;
- evidence plugins and historical comparison.

See [ROADMAP.md](ROADMAP.md) for the completed implementation roadmap and future direction.

## Installation

PRTruth is published on npm:

```bash
npm install --save-dev prtruth
```

or run it without installing:

```bash
npx prtruth --help
```

Package: [npmjs.com/package/prtruth](https://www.npmjs.com/package/prtruth)

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
