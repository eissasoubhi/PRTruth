# PRTruth demo

PRTruth answers a narrow question: **does the evidence around a pull request actually support what the pull request says is done?**

This walkthrough uses a real merged public pull request so the demo is independently inspectable rather than a synthetic happy path.

- Issue: [eissasoubhi/ai-saas-factory#1](https://github.com/eissasoubhi/ai-saas-factory/issues/1)
- Pull request: [eissasoubhi/ai-saas-factory#3](https://github.com/eissasoubhi/ai-saas-factory/pull/3)
- The PR closes the issue, so PRTruth can infer the issue number automatically.

![PRTruth real pull request demo](assets/prtruth-demo.svg)

## 1. Run the real demo without installing PRTruth

Use `report-only` while exploring so an `UNPROVEN` result does not fail your shell command:

```bash
npx -y prtruth@latest verify \
  --repo eissasoubhi/ai-saas-factory \
  --pr 3 \
  --policy report-only
```

No GitHub token is required for this basic public-repository check.

## 2. What makes this case useful

The issue includes acceptance criteria such as:

- server-side authorization for organization-scoped operations;
- single-use expiring invitations;
- automated tests for core identity/workspace flows;
- environment variables and local setup documented.

The merged PR says:

> Self-hosted Linux ARM64 CI passes install, lint, typecheck, tests and production build.

That sounds strong. PRTruth still keeps claims conservative when GitHub does not expose evidence strong enough for the exact statement.

The repository's recurring real-project dogfood asserts two important boundaries for this exact history:

- **Automated tests for core identity/workspace flows → `UNPROVEN`**. Relevant files can help a reviewer navigate, but generic green CI does not prove that broad business-flow coverage.
- **The Linux ARM64 validation claim → `UNPROVEN`** when the observed check names do not prove the claimed `linux, arm64` scope. Unscoped green CI is not cited as proof of that stronger platform claim.

This is the point of PRTruth: a green check is evidence for what the check actually demonstrates, not a blank cheque for every sentence in the PR description.

## 3. Read results as evidence, not a score

PRTruth uses three deliberately strict states:

- `PROVEN` — observable evidence supports the requirement or claim.
- `FAILED` — observable evidence contradicts it or a required check failed.
- `UNPROVEN` — the available evidence is not strong enough to decide.

A successful test job can prove that the observed tests passed. It does **not** automatically prove authorization behavior, backward compatibility, an exact coverage percentage, a hidden command, or a platform scope that GitHub never exposed.

PRTruth prefers `UNPROVEN` over invented certainty.

## 4. Try PRTruth on your own public pull request

```bash
npx -y prtruth@latest verify \
  --repo owner/repository \
  --issue 123 \
  --pr 456 \
  --policy report-only
```

If the pull request contains exactly one closing reference such as `Closes #123`, omit `--issue 123` and PRTruth will infer it.

## 5. Add PRTruth to GitHub Actions

Start in non-blocking mode:

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
      - uses: eissasoubhi/PRTruth@v0.1.15
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

Observe reports on real pull requests first. Then move to `failures-only` or `strict` only if that fits your merge policy.

## 6. Generate machine-readable evidence

```bash
npx -y prtruth@latest verify \
  --repo eissasoubhi/ai-saas-factory \
  --pr 3 \
  --policy report-only \
  --format json \
  --output prtruth.json
```

PRTruth can also produce terminal, Markdown, and badge output.

## Why the demo stays conservative

This page intentionally does not turn relevant diff lines into proof and does not claim statuses that the recurring executable dogfood does not assert. The marketing demo and the verifier are held to the same evidence standard.

## Next steps

- Follow the [GitHub Actions quickstart](github-actions.md).
- See the [AI coding-agent workflow playbook](agent-workflows.md).
- Read [How PRTruth works](how-it-works.md) for the evidence model and current limitations.
