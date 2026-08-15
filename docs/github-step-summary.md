# GitHub Actions step summary

PRTruth can append its Markdown evidence report to the current GitHub Actions job summary:

```yaml
- name: Verify pull request evidence
  env:
    GITHUB_TOKEN: ${{ github.token }}
  run: |
    npx prtruth verify \
      --issue 148 \
      --pr 152 \
      --repo ${{ github.repository }} \
      --github-summary
```

`--github-summary` uses the `GITHUB_STEP_SUMMARY` path provided by GitHub Actions. PRTruth fails with exit code `2` when the flag is requested outside an environment that provides that variable.

The selected terminal/Markdown/JSON output can still be written to stdout or `--output`; the job summary always receives the human-readable Markdown report.
