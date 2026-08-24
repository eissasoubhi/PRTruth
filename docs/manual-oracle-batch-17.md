# Manual oracle batch 17 — hardware-bound verification ceiling

## Public case

- Repository: `batonogov/terraform-provider-synology-dsm`
- Issue: #121 — manage the firewall global enable switch
- PR: #127 — merged into `main`
- Exact PR head: `e0b434b8a1b5e6d4a06d8b3109ef82bd5ccf3df0`

Issue #121 asks for a writable firewall enable switch and explicitly requires the existing lockout-safety treatment: enabling must refuse by default when the resulting rules would deny the provider session, with an explicit override.

## Independent inspection

PR #127 implements a profile-level `dsm_firewall` resource, a writable `enabled` field, and separate lockout logic for enabling a previously disabled firewall. Focused client tests cover enable payloads, lockout refusal, override behavior, the one-reachable-adapter case, profile switching, default-policy tightening, empty rule sets, and idempotence. The exact PR head has a successful GitHub `Test` workflow.

The same PR is unusually explicit about its evidence ceiling: nothing in the change was run against a physical NAS. Its acceptance checklist leaves `Verified against physical hardware — needs a NAS reachable by console` unchecked, and its `What is left unverified` section identifies the real DSM wire details most likely to differ from the simulated fixture.

## Human oracle

Against issue #121 itself, the implementation and focused tests strongly support both requested behaviors:

1. the firewall global switch is writable from configuration;
2. enabling is guarded against lockout with an explicit opt-in override.

However, this is not equivalent to proving the undocumented DSM write contract on physical hardware. Exact-head generic CI validates the implementation against mocks/fixtures; it cannot establish that a real NAS accepts the inferred verb/encoding or applies the profile exactly as expected.

The safe human conclusion is therefore **strong implementation evidence with a real-device proof ceiling**, not an unconditional end-to-end production proof.

## Classification

This case is primarily a **genuinely unprovable-with-current-evidence boundary**, and secondarily a future evidence-model opportunity. PRTruth should not convert green generic CI into proof of an external hardware behavior that the candidate explicitly marks unverified.

A future deterministic adapter could distinguish evidence scopes such as unit/simulated, repository integration, and external-device/live verification. Until such provenance is available, conservative `UNPROVEN` is preferable to a false `PROVEN` for the hardware-dependent layer.

No Synology-specific keyword heuristic is justified by this case.
