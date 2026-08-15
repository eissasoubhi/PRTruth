# Evidence plugins

PRTruth evidence plugins provide a small deterministic extension point for requirement-specific evidence evaluation.

Each plugin exposes a stable `id`, a human-readable `name`, a `supports` predicate, and an `evaluate` function. The evaluation receives the requirement, changed files, and GitHub check summaries already collected by PRTruth.

`evaluateWithPlugins` evaluates plugins in registration order and returns the first matching result. When no plugin supports the requirement, it returns `null` so the caller can preserve PRTruth's conservative fallback behavior instead of manufacturing evidence.

Plugins must return concrete `PROVEN`, `FAILED`, or `UNPROVEN` evidence. A plugin should only return `PROVEN` when its evidence source deterministically supports the claim; broad or ambiguous requirements should remain unsupported or `UNPROVEN`.

This initial contract is intentionally synchronous and dependency-free. Loading third-party packages, configuration discovery, plugin isolation, and marketplace/distribution concerns are separate future integrations.
