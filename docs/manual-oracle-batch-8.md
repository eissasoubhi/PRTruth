# Manual oracle batch 8 — deterministic frontend CI

## Case

`misospace/KubeTix` issue #359 / PR #373.

The issue has a bold `Acceptance:` section with three concrete CI requirements. Before this batch, PRTruth did not recognize singular `Acceptance` as an acceptance heading, so fallback list extraction also pulled the three bullets under `Evidence` into the requirement set.

## Independent oracle

### Requirement 1 — frontend tests run in CI on PRs and pushes to main

**Human assessment: PROVEN.** The PR changes `.github/workflows/ci.yml` by adding a `frontend-test` job that checks out the repository, sets up Node 20, runs `npm ci` in `kubetix-web`, and then runs `npm test`. The workflow itself is the repository CI workflow used on the PR, and the exact PR head `08c12698856425a13ceb3117be81ab1f171e12af` has a successful `CI` run. Its `frontend-test` job completed successfully and includes the successful executable step `Run frontend unit tests`.

The `npm test` script is the package's Vitest suite. A failing test command would fail that shell step and therefore the job unless explicitly masked; the added workflow does not mask the command.

### Requirement 2 — lockfile install and same Node version as build

**Human assessment: PROVEN.** The added test job uses `npm ci` and Node `20`. The existing build job also uses Node 20. These are direct workflow-source invariants, not inferred application behavior.

### Requirement 3 — frontend suite gates the PR and appears in checks

**Human assessment: PROVEN for the requested observable gate shape.** On the exact PR head, GitHub exposes a distinct successful `CI / frontend-test` job. The job contains `Run frontend unit tests`, so the frontend suite is observable in checks rather than hidden inside an unrelated build step. The issue permits either a deliberately broken test or the existing suite as verification; the real PR uses the existing suite and the job is present in exact-head checks.

Human issue-level verdict: **PROVEN (3/3)**.

## Baseline PRTruth result

Before the extractor fix, the real run returned six `UNPROVEN` requirements:

- three historical/evidence bullets describing the pre-fix repository state;
- the three actual acceptance criteria.

This is a requirement-extraction defect. `Evidence` is explanatory input, not desired post-change behavior, and the explicit `Acceptance:` heading should bound the authoritative requirement set.

## Fix boundary

The generic parser now:

- recognizes singular `Acceptance` alongside `Acceptance criteria`;
- treats an `Evidence` section as non-requirement metadata during fallback extraction;
- regression-tests the observed issue shape;
- keeps evidence/verdict semantics unchanged.

After the parser fix, the real corpus must select exactly the three acceptance requirements and reject all three evidence bullets.

## Remaining verifier gap

Even with the correct requirement set, these criteria exercise a stronger question: whether deterministic workflow source plus exact-head job/step observations can prove CI wiring requirements. The human oracle can establish all three from direct structured evidence, but PRTruth should only promote them when a generic adapter can bind the relevant workflow facts without loose prose similarity.

No fuzzy matching is introduced in this batch. If the post-fix run remains `UNPROVEN`, that is recorded as a missing deterministic CI/workflow-source adapter rather than papered over with keywords.
