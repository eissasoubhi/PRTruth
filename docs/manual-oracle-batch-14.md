# Manual oracle batch 14 — Java publishing deviations and follow-up semantics

This oracle uses public repository history from `azholdaspaev/netty-loom-spring` issue #31 and pull request #176.

## Why this case matters

The issue has five explicit acceptance criteria for a Maven Central publishing workflow. The merged pull request deliberately departs from several of them and explains why. This makes the case useful for separating factual requirement satisfaction from justified design deviations and follow-up work.

A verifier must not silently turn a documented deviation into `PROVEN`, but it also should not lose the distinction between a genuine defect, a deliberate replacement design, and a criterion that is blocked on external setup.

## Independent manual verdict

Literal issue oracle: **2/5 PROVEN, 3/5 not satisfied as written; issue-level FAILED**.

1. **Two-job publish workflow with snapshot on push to `main` and release on `v*.*.*` using `./gradlew publish`: not satisfied as written.** The PR creates `snapshot` and `release`, but snapshots are intentionally manual via `workflow_dispatch`. The release path stages with Gradle and uploads a bundle to Central Portal with `curl` because the Portal release API is not a Maven repository URL. This is a deliberate design replacement, not an accidental omission.
2. **Both jobs use the listed GitHub-provided secrets: not satisfied literally.** The release job uses Central credentials plus GPG key/passphrase. The snapshot job intentionally uses only Central credentials because snapshots do not require signing. No secret values are embedded in the workflow.
3. **Missing required secrets fail loudly: PROVEN.** The release job has an explicit `Require publishing secrets` guard. The snapshot path relies on Gradle `PasswordCredentials`, which fails while constructing the task graph if the required Central properties are absent.
4. **Dry-run proves a snapshot lands in Central Snapshots and resolves from a scratch Gradle project: not satisfied.** The PR explicitly says this was not done because Portal SNAPSHOT support and the user token still require external setup tracked in issue #175.
5. **Release notes generated automatically: PROVEN.** The release job extracts the matching version section from `CHANGELOG.md` and passes it to `gh release create --notes-file`.

The exact PR head `a6eb9326bb1c251c87664fbf7cd571db44501001` has a successful `Build` workflow run. That broad build success supports repository health but does not prove the external Central snapshot dry-run criterion.

## Model finding

This case strengthens the need for requirement-resolution metadata separate from the factual evidence status. At least three different states appear here:

- a **deliberate replacement/deviation** from the original requirement because the requirement described an invalid or unwanted implementation;
- a **follow-up blocked on external configuration** where the original criterion remains factually incomplete;
- an ordinary **PROVEN** criterion backed by code and deterministic workflow structure.

Until PRTruth has an explicit lifecycle/resolution model for those distinctions, it should keep conservative statuses rather than inferring that a closed issue or merged PR makes every acceptance criterion true.
