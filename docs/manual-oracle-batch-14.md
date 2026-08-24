# Manual oracle batch 14 — Java publishing deviations and follow-up semantics

This oracle uses public repository history from `azholdaspaev/netty-loom-spring` issue #31 and pull request #176.

## Why this case matters

The issue has five top-level acceptance criteria for a Maven Central publishing workflow. The merged pull request deliberately departs from several of them and explains why. This makes the case useful for separating factual requirement satisfaction from justified design deviations and follow-up work.

A verifier must not silently turn a documented deviation into `PROVEN`, but it also should not lose the distinction between a genuine defect, a deliberate replacement design, and a criterion that is blocked on external setup.

## Independent manual verdict

Literal issue oracle: **2/5 PROVEN, 3/5 not satisfied as written; issue-level FAILED**.

1. **Two-job publish workflow with snapshot on push to `main` and release on `v*.*.*` using `./gradlew publish`: not satisfied as written.** The PR creates `snapshot` and `release`, but snapshots are intentionally manual via `workflow_dispatch`. The release path stages with Gradle and uploads a bundle to Central Portal with `curl` because the Portal release API is not a Maven repository URL. This is a deliberate design replacement, not an accidental omission.
2. **Both jobs use the listed GitHub-provided secrets: not satisfied literally.** The release job uses Central credentials plus GPG key/passphrase. The snapshot job intentionally uses only Central credentials because snapshots do not require signing. No secret values are embedded in the workflow.
3. **Missing required secrets fail loudly: PROVEN.** The release job has an explicit `Require publishing secrets` guard. The snapshot path relies on Gradle `PasswordCredentials`, which fails while constructing the task graph if the required Central properties are absent.
4. **Dry-run proves a snapshot lands in Central Snapshots and resolves from a scratch Gradle project: not satisfied.** The PR explicitly says this was not done because Portal SNAPSHOT support and the user token still require external setup tracked in issue #175.
5. **Release notes generated automatically: PROVEN.** The release job extracts the matching version section from `CHANGELOG.md` and passes it to `gh release create --notes-file`.

The exact PR head `a6eb9326bb1c251c87664fbf7cd571db44501001` has a successful `Build` workflow run. That broad build success supports repository health but does not prove the external Central snapshot dry-run criterion.

## PRTruth comparison

The real public rerun reports **`NOT_PROVEN` with 0 PROVEN / 0 FAILED / 7 UNPROVEN**.

PRTruth currently atomizes the two nested job bullets under the first top-level acceptance criterion. The issue therefore has five human-authored top-level criteria but seven verifier rows:

1. `.github/workflows/publish.yml` exists with two jobs;
2. snapshot behavior;
3. release behavior;
4. GitHub-provided secrets;
5. fail-loud missing-secret behavior;
6. external snapshot dry-run;
7. release-note generation.

This run keeps that granularity observable rather than changing parser semantics merely to make the corpus match the human grouping. Nested bullets can be independently testable requirements, so `5 -> 7` is a requirement-model/granularity question rather than an automatic extraction defect.

The disagreements split into distinct classes:

- **Missing deterministic workflow-source adapter:** the fail-loud behavior and release-note generation are factually supported by concrete workflow structure, but PRTruth does not yet prove those source-level semantics safely.
- **Requirement-resolution/model gap:** the snapshot trigger and release-upload mechanism deliberately replace literal issue instructions after the author concluded those instructions were wrong or undesirable. That is neither ordinary `PROVEN` nor an accidental implementation failure.
- **Literal mismatch with an intentional design choice:** the snapshot job does not consume GPG secrets. A future resolution model should preserve that the requirement was consciously revised rather than pretending the original text became true.
- **Genuinely incomplete / follow-up blocked:** the Central Snapshots dry-run was explicitly not performed and remains dependent on external Portal setup. It must not become `PROVEN` from a merged PR or a broad green build.

No verifier semantic is changed for this case. In particular, the corpus does not introduce fuzzy workflow-to-requirement matching or treat merge/closure as evidence of acceptance completion.

## Model finding

This case strengthens the need for requirement-resolution metadata separate from factual evidence status. At least three different states appear here:

- a **deliberate replacement/deviation** from the original requirement because the requirement described an invalid or unwanted implementation;
- a **follow-up blocked on external configuration** where the original criterion remains factually incomplete;
- an ordinary **PROVEN** criterion backed by code and deterministic workflow structure.

Until PRTruth has an explicit lifecycle/resolution model for those distinctions, it should keep conservative statuses rather than inferring that a closed issue or merged PR makes every acceptance criterion true.
