# Manual oracle batch 13 — Ruby deletion / preservation boundary

This oracle uses public repository history from `tylercschneider/alembic` issue #87 and pull request #106.

## Why this case matters

The issue is a deletion-heavy maintenance task with six explicit acceptance criteria. It asks for twelve dead runtime methods/helpers to disappear while several nearby behaviors and the authoring pipeline must remain untouched. This is a useful negative-space case: a verifier must distinguish evidence that code was removed from evidence that protected code was preserved.

## Independent manual verdict

Human oracle: **6/6 PROVEN**.

- The PR changes only two files and deletes 179 lines with no additions.
- The patch removes the eight named public runtime methods and four named private helpers from `Alembic::Diagnostic`.
- The same patch leaves `Diagnostic#place` in place and retains its tests while removing the orphaned tests for deleted methods.
- The compile/authoring methods occur outside the deletion hunks and are not modified by the PR.
- The exact PR head `3fcbe56c7f3fee3c5564ecb1c7db8304dfc00860` has a successful GitHub Actions `CI` run. Its `lint` job succeeds at `Lint code for consistent style`, and its `test` job succeeds at `Run tests`.
- The PR was merged after that exact-head CI succeeded.

This case should remain conservative in PRTruth unless the verifier has deterministic adapters for source deletion/preservation and can associate exact-head test/lint jobs with the relevant acceptance criteria. A globally green CI run alone must not prove every structural requirement.
