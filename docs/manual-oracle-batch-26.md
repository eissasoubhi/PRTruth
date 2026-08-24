# Manual oracle batch 26 — retained fixture vs live external evidence

## Case

- Repository: `D0ubleD0uble/fieldglass`
- Issue: #426 — NCEP GRIB2 local parameters from the wgrib2 table
- Pull request: #457
- Exact PR head: `d5f395abf590033099453a838a8b83bd55981880`
- Ecosystem: Rust + Python generator + GitHub Actions

The issue has one explicit `Acceptance.` paragraph with three semicolon-separated requirements:

1. A spot-check set of NCEP parameters resolves to the same abbreviation, name, and units reported by wgrib2.
2. A real GFS or HRRR file from `samples/` shows named parameters end to end.
3. Regeneration is byte-identical.

## Independent oracle

### 1. Spot-checks match wgrib2 — PROVEN

The PR adds `well_known_ncep_parameters_resolve`, which checks the exact abbreviation/name/unit triples for `MSLET`, `MSLMA`, `CSNOW`, `REFC`, and `SNOHF`. It also adds a 479-row independent eccodes cross-check with the three known naming divergences pinned explicitly. On the exact PR head, the repository CI completed successfully, including the pre-commit push-stage hook that runs `cargo test --workspace`.

This requirement has retained source-level test evidence plus exact-head successful execution evidence.

### 2. Real GFS or HRRR file from `samples/` — FAILED as written

The retained end-to-end regression uses `tests/fixtures/eta_lambert_msg0.grib2`, an NCEP Eta message. That is a real NCEP message and it proves the local-table path end to end, but it is not the GFS-or-HRRR-from-`samples/` artifact required by the original acceptance text.

The PR body additionally reports a live 61-message GFS surface-file check with zero unnamed messages. That is useful human evidence, but the live file and its execution transcript are not retained in the repository or an authoritative CI artifact for the exact head. It therefore cannot substitute for the literal acceptance requirement.

This is a deliberately strict oracle distinction: a stronger or adjacent manual demonstration does not rewrite the original requirement.

### 3. Regeneration is byte-identical — UNPROVEN from retained exact-head evidence

The PR body states that regeneration is byte-identical, but the exact-head CI workflow does not expose a named step that reruns `tools/gen_ncep_tables.py` and then asserts a clean diff for the generated Rust table/snapshots. The normal pre-commit and workspace test jobs are green, but a generic green job is not proof that this particular regeneration operation was executed.

Until a deterministic command/execution path is retained, this remains `UNPROVEN` rather than inferred from the PR description.

## Expected PRTruth behavior

The useful safety property for this batch is not that PRTruth must match the human 1/1/1 split immediately. It is that PRTruth must not:

- turn a generic green Rust CI into proof of the live GFS/HRRR acceptance criterion;
- treat the Eta fixture as equivalent to the explicitly requested GFS/HRRR sample scope;
- treat an author-written `regeneration is byte-identical` claim as executed evidence without a retained command/result path.

Any disagreement should be classified as a missing deterministic source/test-to-requirement adapter or evidence-provenance gap unless the real rerun exposes a parser/extraction defect.
