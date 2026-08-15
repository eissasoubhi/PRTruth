# Verification policy

PRTruth remains strict by default: anything other than a fully `PROVEN` report exits with code `1`.

Use `--policy` when a repository wants a different merge-gate policy:

```bash
# Default: block on FAILED or NOT_PROVEN
prtruth verify --issue 148 --pr 152 --policy strict

# Block only when evidence explicitly fails a requirement
prtruth verify --issue 148 --pr 152 --policy failures-only

# Always report without making the command fail because of the verdict
prtruth verify --issue 148 --pr 152 --policy report-only
```

Runtime/API/CLI errors still exit with code `2` in every policy. The policy changes only how a completed verification verdict maps to the process exit code.
