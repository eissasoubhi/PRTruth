# GitHub Actions quickstart

PRTruth can run on every pull request and turn issue requirements plus PR evidence into a review signal.

## Fastest setup

This workflow assumes the pull request description contains exactly one GitHub closing reference such as `Fixes #123`, `Closes #123`, or `Resolves #123`.

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
      - uses: eissasoubhi/PRTruth@v0.1.2
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

That is enough to:

- infer the issue number from the PR description;
- read the issue acceptance criteria;
- inspect the PR, changed files, GitHub checks, and workflow steps;
- add the Markdown report to the GitHub Actions job summary;
- keep the workflow non-blocking while you evaluate PRTruth.

## Make PRTruth a merge gate

After you are comfortable with the reports, change the policy:

```yaml
with:
  pr: ${{ github.event.pull_request.number }}
  policy: strict
```

Policies:

- `report-only` — always report; do not fail because of the PRTruth verdict;
- `failures-only` — fail only when deterministic evidence is explicitly `FAILED`;
- `strict` — fail when evidence is `FAILED` or requirements remain unproven.

## Keep one PRTruth comment on the pull request

To let PRTruth create or update one evidence comment, add write permission for issue comments and enable `comment`:

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: read
  checks: read
  actions: read

steps:
  - uses: eissasoubhi/PRTruth@v0.1.2
    with:
      pr: ${{ github.event.pull_request.number }}
      policy: report-only
      comment: "true"
```

PRTruth uses a hidden marker and updates its existing comment on later runs instead of creating a new comment each time.

## Choose the issue explicitly

Automatic inference is intentionally conservative. If a PR has no closing issue reference, or closes several issues, provide the issue number explicitly:

```yaml
with:
  issue: 123
  pr: ${{ github.event.pull_request.number }}
  policy: report-only
```

The CLI behaves the same way:

```bash
# inferred from one `Fixes #123` / `Closes #123` / `Resolves #123` reference
npx prtruth verify --pr 456 --policy report-only

# explicit issue selection
npx prtruth verify --issue 123 --pr 456 --policy report-only
```

## Why inference is strict

PRTruth does not guess between multiple linked issues. If a PR closes `#123` and `#124`, it asks you to pass one issue explicitly. That keeps the verification target deterministic and the report reproducible.
