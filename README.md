# PRTruth

**Your pull request says it is done. PRTruth checks the evidence.**

[![npm](https://img.shields.io/npm/v/prtruth)](https://www.npmjs.com/package/prtruth)
[![CI](https://github.com/eissasoubhi/PRTruth/actions/workflows/ci.yml/badge.svg)](https://github.com/eissasoubhi/PRTruth/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

PRTruth is an open-source CLI and GitHub Action that verifies whether **pull-request requirements and completion claims are actually supported by observable repository evidence**.

**Deterministic. Evidence-first. No LLM required for the verdict.**

![PRTruth evidence demo](docs/assets/prtruth-demo.svg)

## Try it on a pull request

No install is required. For any public repository, start in report-only mode:

```bash
npx -y prtruth@latest verify \
  --repo owner/repository \
  --pr 456 \
  --policy report-only
```

If the pull request closes exactly one issue, PRTruth can infer the issue automatically. Otherwise pass `--issue 123` explicitly.

[See the 60-second walkthrough →](docs/demo.md)

PRTruth returns three deliberately strict states:

- **PROVEN** — concrete observable evidence supports the requirement or claim.
- **FAILED** — observable evidence contradicts it or a required check failed.
- **UNPROVEN** — the available evidence is not strong enough to say it is done.

> PRTruth does not ask “does this change look convincing?” It asks **“what can this repository actually prove?”**

## Why PRTruth?

AI coding agents and automation can create pull requests faster than humans can manually verify every completion claim. CI helps, but green CI only proves what the checks that actually ran demonstrate.

PRTruth adds a separate verification layer:

```text
Coding agent / human
        ↓
   Pull request
        ↓
        CI
        ↓
     PRTruth
        ↓
   Human review
```

It is useful for:

- reviewing pull requests created by Codex, Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, or humans;
- checking issue acceptance criteria before merge;
- fact-checking claims such as “tests pass”, “build passes”, or “no breaking changes”;
- generating machine-readable verification receipts for automation and audit trails;
- keeping a strict boundary between evidence and guesses.

## PRTruth vs CI vs AI code review

| Tool | Best at | What it does not prove by itself |
| --- | --- | --- |
| CI | Running tests, lint, typecheck, build, security checks | That every issue requirement is satisfied |
| AI code review | Finding suspicious code, explaining changes, suggesting improvements | A deterministic proof that a completion claim is true |
| **PRTruth** | Connecting issue requirements and PR claims to observable repository evidence | Complex runtime/business behavior without a deterministic evidence source |

PRTruth **complements CI and code review**. It does not replace either one.

## 60-second example

Suppose an issue says:

```text
Acceptance criteria
- Export endpoint exists
- Only admins can export
- Tests pass
- No breaking changes
```

A PR says everything is complete. PRTruth might report:

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

When a requirement is not provable, PRTruth can still show a small number of relevant added patch lines to help the reviewer find where the implementation lives. Those lines remain **candidate evidence only** and never become `PROVEN` merely because their text looks relevant.

## How it works

PRTruth follows an evidence-first deterministic pipeline:

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

The core verifier does **not** send your code to an LLM to decide whether it is correct. It reads structured GitHub evidence and applies explicit rules so results stay explainable, reproducible, and conservative.

See [How PRTruth works](docs/how-it-works.md) for the technical model and current limitations.

## Try it on your repository

For a public repository:

```bash
npx -y prtruth@latest verify \
  --repo owner/repository \
  --issue 123 \
  --pr 456 \
  --policy report-only
```

If the PR contains exactly one closing reference such as `Closes #123`, omit `--issue 123` and PRTruth will infer it automatically.

For a repository detected from your local Git remote:

```bash
npx prtruth verify --pr 152 --policy report-only
```

Start with `report-only`: it prints the evidence report without failing the command for an `UNPROVEN` result.

## Add PRTruth to every pull request

Start non-blocking, inspect the reports, then strengthen the policy only when the evidence is useful for your team.

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
      - uses: eissasoubhi/PRTruth@v0.1.23
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

Recommended progression:

```text
report-only → observe real reports → failures-only → strict (when appropriate)
```

The Action also supports optional idempotent PR comments and GitHub job summaries.

See the [GitHub Actions quickstart](docs/github-actions.md) for merge-gate and comment examples.

## Common use cases

### AI pull request verification

An AI coding agent says a task is complete. PRTruth checks issue requirements, PR claims, changed files, patch candidates, and CI evidence before you trust the claim.

See the [AI coding-agent workflow playbook](docs/agent-workflows.md) for a practical agent → CI → PRTruth → review flow and agent-specific guidance.

### Acceptance criteria verification

An issue contains a checklist or an `Acceptance criteria` section. PRTruth turns those requirements into explicit `PROVEN`, `FAILED`, or `UNPROVEN` results.

### CI claim fact-checking

A PR description says “tests pass”, “build is green”, or “full CI succeeds”. PRTruth checks observed GitHub checks and workflow steps instead of trusting the text in the PR description.

### Review and audit receipts

Generate JSON or Markdown evidence reports for automated review workflows, release checks, or audit trails without asking a model to invent a confidence score.

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

## What PRTruth can and cannot prove

PRTruth is intentionally conservative.

Good deterministic evidence includes:

- completed GitHub checks and CI steps;
- changed files and relevant added patch lines as navigation evidence;
- test, lint, typecheck, build, API/schema, and static-analysis evidence;
- repository instructions such as `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`;
- supported agent-session evidence adapters;
- signed/hash-addressed verification receipts.

PRTruth does **not** pretend that weak evidence proves a strong claim. Examples that should remain `UNPROVEN` without stronger deterministic evidence include:

- complex runtime or business behavior that was not observably exercised;
- “no breaking changes” merely because normal CI is green;
- exact test/coverage/performance numbers not present in observable evidence;
- an explicitly empty exception/suppression/allowlist state or an unchanged numeric coverage baseline when the successful check does not expose that stronger state/value;
- hidden commands inside generic wrapper steps;
- platform, runner, service, browser, or hardware scopes that GitHub evidence does not expose;
- historical red-first clauses such as “failing before the fix” when only current-head green CI is observable;
- packaged-runtime or installer claims such as NSIS-installed or `win-unpacked` behavior when only generic dependency-install/build checks are observable;
- compound specialized-validation claims when an explicitly named sub-scope such as fault-injection or concurrency testing has no directly matching successful exact-head execution evidence;
- explicit named test scenarios such as `Regression test — <specific behavior>` when only generic test lanes are observable and no successful check/step directly identifies that scenario.

## FAQ

### Does PRTruth use AI to decide whether code is correct?

No. The current core verifier is deterministic. It reads structured GitHub evidence and applies explicit rules. PRTruth deliberately prefers `UNPROVEN` over an AI-generated guess.

### Is PRTruth an AI code review bot?

No. It does not try to replace a reviewer or generate general review comments. Its job is narrower: verify what a pull request can actually prove about issue requirements and completion claims.

### Does green CI mean the pull request is `PROVEN`?

No. Green CI proves the checks that actually ran. A business rule, authorization requirement, compatibility claim, historical red-first clause, packaged-runtime claim, strengthened validation-state/baseline claim, explicitly named validation sub-scope, explicit named test scenario, or edge-case claim can still remain `UNPROVEN`.

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

See [ROADMAP.md](ROADMAP.md) for the implementation roadmap and future direction.

## Installation

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

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the security boundaries that matter for evidence integrity.

## License

MIT
