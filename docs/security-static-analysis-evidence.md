# Security and static-analysis evidence

PRTruth treats security and static-analysis results as deterministic evidence only when GitHub reports a recognizable dedicated check.

Recognized examples include CodeQL, Semgrep, Snyk, Trivy, gosec, Bandit, OSV Scanner, dependency review, package-manager audit checks, PHPStan, Psalm, and explicitly named security/static-analysis checks.

## Verdict semantics

- `PROVEN`: every recognized matching check completed successfully.
- `FAILED`: at least one recognized matching check completed with failure, timeout, cancellation, or action required.
- `UNPROVEN`: a recognized check is incomplete, or security/static-analysis configuration changed without a matching CI result.

Generic `lint`, `test`, and `build` checks are intentionally not accepted as security/static-analysis proof. A green generic pipeline is useful evidence for its own purpose, but it does not prove that a security scanner or static analyzer actually ran.

Configuration-file changes such as `.semgrep.yml`, CodeQL configuration, `phpstan.neon`, and `psalm.xml` make the adapter applicable but do not themselves prove success.
