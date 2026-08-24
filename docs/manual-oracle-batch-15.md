# Manual oracle batch 15 — runtime/live-proof boundary

This batch uses a real public history from `openclaw/openclaw` issue #119682 and PR #128485.

The issue contains four explicit acceptance criteria covering cross-turn polling, a >10-minute silent build, gateway-restart continuity, and turn-independent or operator-configurable relay lifetime.

Independent review of the merged PR finds a deliberately narrower implementation contract. The exact PR head has green CI, CodeQL and OpenGrep runs, and the PR reports focused deterministic suites covering cross-turn child routing, active-child renewal, cleanup and fail-closed ownership behavior. The PR also explicitly states that Docker/live proof was skipped, gateway restart remains fail-closed and requires redispatch, and no persistent/configurable relay authority is introduced.

Literal independent assessment of the original criteria:

| Acceptance criterion | Human oracle | Reason |
| --- | --- | --- |
| A worker dispatched in turn A can be polled from a later turn without `relay not found` | `PROVEN` | The implementation deliberately retains origin-bound child relay bindings across parent turns, and focused regression coverage exercises successor-turn child routing. |
| A >10-minute build retains its relay and can later push/open a PR | `UNPROVEN` | Active-child renewal is implemented and deterministically exercised, but the requested long live workload and authenticated push/PR path were not run; the PR explicitly disclaims live Docker proof. |
| A gateway restart does not permanently orphan an in-flight pod | `FAILED` against the literal original criterion | The merged PR explicitly keeps restart fail-closed and requires redispatch. This is an accepted security boundary in the final implementation contract, but it does not make the original statement factually true. |
| Relay lifetime is turn-independent by design, or operator-configurable | `PROVEN` for the first branch | The relay lifetime is decoupled from the spawning parent turn through retained child lifecycle bindings and active-child renewal. No operator configuration is required to satisfy the criterion's `either/or` wording. |

PRTruth currently reports `0 PROVEN / 0 FAILED / 4 UNPROVEN`. The two positive human results need domain-aware lifecycle/test evidence before they can be promoted safely. More importantly, the restart result exposes a model boundary already seen in waiver/follow-up/deviation cases: an accepted change of implementation contract is distinct from factual satisfaction of the original requirement. PRTruth should not infer that distinction from prose heuristics.

The oracle therefore protects a core PRTruth boundary: large green focused suites and exact-head CI may support the behavior they actually exercise, but they must not silently prove stronger live-runtime or restart-continuity acceptance criteria that the PR itself says were not exercised or were intentionally changed.

The workflow asserts that all four original acceptance criteria remain observable and that the report is not globally `PROVEN`; the gateway-restart criterion specifically must not be `PROVEN`.

This corpus fixture is internal dogfood. It does not change public examples or documentation positioning, and it adds no project-specific proof shortcut.
