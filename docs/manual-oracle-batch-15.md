# Manual oracle batch 15 — runtime/live-proof boundary

This batch uses a real public history from `openclaw/openclaw` issue #119682 and PR #128485.

The issue contains four explicit acceptance criteria covering cross-turn polling, a >10-minute silent build, gateway-restart continuity, and turn-independent or operator-configurable relay lifetime.

Independent review of the merged PR finds a deliberately narrower implementation contract. The PR documents strong focused deterministic test evidence for same-process cross-turn routing and active-child renewal, but it also explicitly states that Docker/live proof was skipped, gateway restart remains fail-closed and requires redispatch, and no persistent/configurable relay authority is being introduced.

The oracle therefore protects a core PRTruth boundary: large green focused suites and exact-head CI may support the behavior they actually exercise, but they must not silently prove stronger live-runtime or restart-continuity acceptance criteria that the PR itself says were not exercised or were intentionally changed.

The workflow asserts that all four original acceptance criteria remain observable and that the report is not globally `PROVEN`; the gateway-restart criterion specifically must not be `PROVEN`.

This corpus fixture is internal dogfood. It does not change public examples or documentation positioning, and it adds no project-specific proof shortcut.
