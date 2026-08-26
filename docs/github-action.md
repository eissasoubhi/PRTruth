# GitHub Action

PRTruth can run as a composite GitHub Action on pull requests. Use a released tag rather than `main` so the workflow executes a fixed, auditable PRTruth version.

```yaml
name: PRTruth

on:
  pull_request:

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
      - uses: eissasoubhi/PRTruth@v0.1.21
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

The Action uses `github.repository` by default. If the pull request closes exactly one issue, PRTruth can infer that issue; otherwise pass `issue` explicitly. Markdown is the default Action report format and the job summary is enabled by default.

Policies are explicit:

- `report-only` reports evidence without failing because of a PRTruth verdict;
- `failures-only` fails only on deterministic `FAILED` evidence;
- `strict` fails when evidence is `FAILED` or requirements remain unproven.

The composite Action reads its own package version, then executes that exact public `prtruth@<version>` from the npm registry in a clean temporary directory. It disables npm lifecycle scripts, audit, funding extras, and authenticated user npm configuration for the consumer execution path.

Optional inputs include `issue`, `repo`, `format`, `comment`, `github_summary`, and `token`. Enabling `comment` requires write permission for issue comments; otherwise keep the minimal read permissions above.

See [GitHub Actions quickstart](github-actions.md) for copy-paste adoption and merge-gate examples.
