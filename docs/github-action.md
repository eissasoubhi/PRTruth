# GitHub Action

PRTruth can run as a composite GitHub Action on pull requests.

```yaml
name: PRTruth

on:
  pull_request:

permissions:
  contents: read
  issues: read
  pull-requests: read
  checks: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: eissasoubhi/PRTruth@main
        with:
          issue: 148
          pr: ${{ github.event.pull_request.number }}
```

The Action uses the repository from `github.repository` by default and renders Markdown unless another format is requested.

PRTruth intentionally exits non-zero when the final verdict is not `PROVEN`, so the Action can act as a strict merge signal. This behavior can be softened at workflow level with `continue-on-error: true` when teams want report-only adoption first.

The initial composite Action installs and builds PRTruth from the checked-out Action source. A later release can replace this bootstrap path with a bundled JavaScript Action for faster startup without changing the verification semantics.
