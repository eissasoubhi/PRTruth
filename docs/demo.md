# PRTruth demo

PRTruth answers a narrow question: **does the evidence around a pull request actually support what the pull request says is done?**

This walkthrough is deliberately repository-neutral. You can reproduce it against any public GitHub repository that has an issue, a pull request, and observable CI.

## 1. Run PRTruth without installing it

Use `report-only` while exploring so an `UNPROVEN` result does not fail your shell command:

```bash
npx -y prtruth@0.1.15 verify \
  --repo owner/repository \
  --issue 123 \
  --pr 456 \
  --policy report-only
```

If the pull request contains exactly one closing reference such as `Closes #123`, you can omit `--issue 123`.

## 2. Read the result as evidence, not a score

A typical report can contain all three outcomes:

```text
Requirement                         Result
────────────────────────────────────────────
Tests pass                          ✓ PROVEN
Lint passes                         ✓ PROVEN
Admin-only export                  ⚠ UNPROVEN
No breaking changes                ⚠ UNPROVEN

Verdict: NOT PROVEN
```

The important part is the boundary:

- `PROVEN` means PRTruth found observable evidence that supports the claim.
- `FAILED` means observable evidence contradicts the claim or a required check failed.
- `UNPROVEN` means the available evidence is not strong enough to decide.

A green test job can prove that the observed tests passed. It does not automatically prove authorization behavior, backward compatibility, an exact coverage percentage, or a command that is hidden inside a generic wrapper step.

## 3. Try a deliberately stronger claim

Suppose a pull request description says:

```text
## Verification

- Tests pass
- 542 tests passed
- No breaking changes
```

If GitHub only exposes a successful `Unit tests` check, PRTruth should distinguish the three statements:

```text
Tests pass                 → PROVEN
542 tests passed           → UNPROVEN
No breaking changes        → UNPROVEN
```

The first statement is supported by the visible test check. The exact count and compatibility claim need stronger evidence.

## 4. Add PRTruth to GitHub Actions

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

After you have observed the reports on real pull requests, move to `failures-only` or `strict` if that fits your merge policy.

## 5. Generate machine-readable evidence

For automation or audit trails:

```bash
npx -y prtruth@0.1.15 verify \
  --repo owner/repository \
  --issue 123 \
  --pr 456 \
  --policy report-only \
  --format json \
  --output prtruth.json
```

The same verifier can also produce Markdown and badge output.

## What this demo is designed to show

PRTruth is not another general-purpose code-review bot. It is an evidence verifier for pull-request completion claims and issue acceptance criteria.

The useful moment is when a PR looks finished, CI is green, and PRTruth still says:

> **This part is proven. This part failed. This part still needs evidence.**

That distinction is especially useful when humans or coding agents create pull requests faster than reviewers can manually verify every claim.

## Next steps

- Read the [60-second example](../README.md#60-second-example).
- Follow the [GitHub Actions quickstart](github-actions.md).
- See the [AI coding-agent workflow playbook](agent-workflows.md).
- Read [How PRTruth works](how-it-works.md) for the evidence model and current limitations.
