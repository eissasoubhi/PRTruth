# Manual oracle batch 10 — Rust / pre-existing implementation

## Case

- Repository: `HubDApp/Dongle-Smartcontract`
- Issue: #177, `Add Report Project Functionality`
- Pull request: #569, `fix: resolve compilation errors and verify report project feature #177`
- Exact PR head: `d78a641d6879d583de4c4669cba5a03e09808f5d`
- Ecosystem: Rust / Soroban smart contract

The issue has four explicit acceptance criteria:

1. Any authenticated user can report a project with a reason CID.
2. Duplicate reports from the same user are prevented.
3. Admins can list or count reports for a project.
4. Tests cover reporting and duplicate prevention.

PRTruth extracts exactly those four requirements and reports `0 PROVEN / 0 FAILED / 4 UNPROVEN`, overall `NOT_PROVEN`.

## Independent oracle

### Requirement 1 — authenticated reporting with reason CID

**Human verdict: PROVEN factually at the exact PR head.**

`dongle-smartcontract/src/report_registry.rs` exposes `ReportRegistry::report_project`. It verifies that the project exists, calls `reporter.require_auth()`, validates the reason CID through `Utils::validate_report_reason_cid`, stores the report, updates count/dedup state, and publishes the report event.

This implementation is not introduced by PR #569. Repository history shows commit `a42f119cc7654821adcaba92fb8838491673c04c` already added the report-project functionality for the earlier issue #127.

Classification versus PRTruth: **pre-existing implementation / missing repository-state semantic adapter**. Do not infer proof from the PR title or body.

### Requirement 2 — duplicate reports are prevented

**Human verdict: PROVEN factually at the exact PR head.**

`report_project` checks `StorageKey::UserReport(project_id, reporter)` and returns `ContractError::AlreadyReported` when it already exists. The first successful report writes that dedup key.

`dongle-smartcontract/src/tests/new_features.rs::test_project_reporting` executes a successful report, then attempts a second report from the same reporter and asserts failure before confirming that a different reporter succeeds.

Classification versus PRTruth: **pre-existing implementation / missing Rust domain and test-semantic adapter**.

### Requirement 3 — admins can list or count project reports

**Human verdict: PROVEN under the literal acceptance wording, with a scope caveat.**

The contract exposes `get_project_reports` and `get_project_report_count`, backed by `ReportRegistry`. An administrator can therefore invoke both operations.

However, these read methods do not themselves enforce admin-only authorization at this head. The source comment says `Get all reports for a project (admin only)`, while the implementation contains no admin check. The issue only says admins *can* list/count, not that *only* admins may do so, so the literal criterion is satisfied. A stricter admin-only interpretation would not be proven and may be a product/security gap.

Classification versus PRTruth: **domain-semantics ambiguity; conservative UNPROVEN is appropriate without a policy-aware adapter**.

### Requirement 4 — tests cover reporting and duplicate prevention

**Human verdict: PROVEN factually at the exact PR head.**

`test_project_reporting` covers successful reporting, report count, the persisted `has_user_reported` state, rejection of a duplicate reporter, and success for a different reporter.

The target PR body additionally claims `555/555` tests, `cargo fmt`, and `cargo clippy`. GitHub exposes no pull-request-triggered Actions workflow run for the exact head SHA, so this batch does **not** independently upgrade the broad `555/555` execution claim to a CI-backed fact. The source-level acceptance criterion only requires tests to cover reporting and duplicate prevention, which the test code does.

Classification versus PRTruth: **missing deterministic test-coverage adapter**. A PR-body test-count assertion is not trusted evidence by itself.

## Duplicate-issue / lifecycle finding

Issue #177 is effectively a later duplicate of issue #127: both have the same title and the same four acceptance criteria. Issue #127 was created on 2026-05-31 and the report-project implementation landed in commit `a42f119c...` on 2026-06-01. Issue #177 was then created on 2026-06-23. PR #569 was opened in August and its authored diff mostly repairs unrelated compilation/test issues; it does not introduce the reporting feature.

This creates an important distinction for PRTruth:

- **factual requirement state at the PR head:** the four issue requirements are satisfied under their literal wording;
- **what the target PR itself implements/proves:** the reporting implementation predates this PR, and no exact-head CI run independently proves the PR body's broad test-count claims.

Treating this as ordinary diff proof would be unsound. A future model may need an explicit `PREEXISTING` / `ALREADY_SATISFIED` resolution or repository-state evidence channel, separate from `PROVEN` by the candidate PR.

## PRTruth result and decision

Current real rerun:

- extracted requirements: 4/4 correct;
- `PROVEN`: 0;
- `FAILED`: 0;
- `UNPROVEN`: 4;
- overall: `NOT_PROVEN`.

No verifier semantics are changed for this case. The conservative result is preferable to introducing repository-name, Rust-function-name, issue-title, or PR-body heuristics. The useful output of this batch is the new Rust corpus coverage plus the documented **pre-existing implementation / duplicate-issue lifecycle** model gap.
