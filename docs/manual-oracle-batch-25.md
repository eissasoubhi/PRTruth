# Manual oracle batch 25 — merged security PR with an unsatisfied review gate

## Case

- Repository: `FinesseStudioLab/modeltrace-contract`
- Issue: #74, **Define the cross-contract authorization pattern before wiring contracts together**
- Pull request: #83, **feat(audit-registry): define and enforce the cross-contract authorization pattern**
- Ecosystem: Rust / Soroban smart contracts
- Focus: authorization, negative security tests, exact-head CI, and a human-review acceptance criterion

Issue #74 defines four explicit acceptance criteria:

1. Authorization tree documented per cross-contract flow.
2. Caller allowlists enforced in code.
3. Tests without `mock_all_auths` covering escalation attempts.
4. Pattern peer-reviewed and the review recorded.

PR #83 was merged on 2026-08-24. Its own description explicitly says the fourth criterion cannot be satisfied from inside the change: it requires review by someone who did not design the pattern, and the documentation review-record table was intentionally left empty pending that review.

## Independent oracle

### 1. Authorization tree documented per cross-contract flow — PROVEN

The PR adds `docs/cross-contract-authorization.md` and describes the authorization trees and the roles of subject, caller, allowlist, and intermediate contracts. The PR description also reproduces the cross-contract tree and explains why the subject's `require_auth_for_args` and the immediate caller's authorization are distinct.

### 2. Caller allowlists enforced in code — PROVEN

`audit-registry/src/lib.rs` adds `AllowedCaller(Address)` storage, admin-controlled `allow_caller` / `revoke_caller`, and checks the passed caller against that allowlist whenever the caller acts on behalf of another subject. It also requires the caller's own authorization, preventing an unenrolled contract from inheriting an enrolled contract's standing merely by naming its address.

### 3. Tests without `mock_all_auths` covering escalation attempts — PROVEN

The new `audit-registry/src/test.rs` explicitly states that it does not call `mock_all_auths` and uses scoped `mock_auths` instead. The tests exercise unauthorized relay and impersonation-style shapes. Exact-head GitHub Actions is green: the `Format, lint, test` job completed successfully, including the `Test` step; the deployable WASM job also succeeded.

### 4. Pattern peer-reviewed and the review recorded — FAILED

This is not merely missing implementation evidence. The acceptance criterion asks for an independent human event and a durable record of it.

Observable GitHub evidence for PR #83 shows:

- zero submitted pull-request reviews;
- zero PR conversation comments;
- the author explicitly says the review-record row should be added by someone else rather than self-attested;
- the PR nevertheless merged and issue #74 closed.

Therefore the original criterion is factually **FAILED at the candidate PR lifecycle boundary**. A later review after merge could create new evidence, but it would not retroactively mean the criterion had been satisfied before this PR merged unless the verifier explicitly models post-merge requirement resolution.

## Human verdict

| Requirement | Human verdict | Why |
| --- | --- | --- |
| Authorization tree documented | PROVEN | Added documentation and explicit authorization flow |
| Caller allowlist enforced | PROVEN | Concrete storage + authorization + allowlist checks in contract code |
| Negative auth tests without `mock_all_auths` | PROVEN | Scoped auth tests exist and exact-head test job passed |
| Independent peer review recorded | FAILED | No review/comment record exists although the criterion explicitly requires one |

Issue-level human verdict: **FAILED** because one explicit acceptance criterion was not satisfied before merge.

## PRTruth comparison

The batch runs current PRTruth source against the real issue and PR in `report-only` mode. The expected safe baseline is exact extraction of the four issue acceptance criteria and a non-`PROVEN` global verdict.

If PRTruth leaves the peer-review criterion `UNPROVEN`, that is conservative but incomplete: the available structured lifecycle evidence supports a stronger negative conclusion. This is best classified as a **missing deterministic review/lifecycle evidence adapter**, not a reason to weaken generic requirement matching.

A future safe adapter could reason from explicit review requirements only when the requirement itself clearly asks for review/approval and GitHub exposes the authoritative review records. It must distinguish:

- no review observed before merge → potentially `FAILED` for an explicit mandatory review requirement;
- review requested but pending on an open PR → `UNPROVEN`, not `FAILED`;
- review submitted and recorded → candidate evidence for `PROVEN`;
- issue/PR closed or merged → lifecycle facts only, never proof that the review happened.

No generic `merged == done` or checked-box heuristic is acceptable.
