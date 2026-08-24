# Manual oracle batch 12 — workflow permission / action-required boundary

This oracle uses public repository history from `stardustsuperwizard/sword-and-planet` issue #168 and pull request #172.

## Why this case matters

The issue asks for a reusable GitHub Actions workflow and explicitly requires the existing pull-request validation lane to keep working. The pull request reports local validation, including YAML parsing and actionlint, but the exact pull-request head has a `Godot CI Validation` workflow conclusion of `action_required` rather than a successful execution.

That distinction is important for PRTruth: text in the PR description saying a local command passed is not equivalent to observable exact-head GitHub execution. A workflow that GitHub refused to run must not be silently treated as successful evidence just because related source changes or local validation claims look plausible.

## Independent manual verdict

- The pull-request diff contains substantial structural evidence for the requested reusable workflow.
- The PR description reports local `validate-godot.sh`, YAML, and actionlint results, but those are self-reported completion claims rather than independently observed CI execution.
- The exact PR head has `Godot CI Validation` in `action_required`, so the acceptance requirement that the human-authored pull-request gate behaves successfully is not demonstrated by the observable GitHub run.
- Therefore the overall result must not be `PROVEN`. Requirements whose behavior is only visible in workflow source or self-reported local commands should remain conservative until stronger structured/executable evidence is available.

The executable oracle intentionally asserts only stable boundaries: all ten authoritative acceptance criteria must be extracted, and the overall verdict must not become `PROVEN` while the exact-head pull-request validation is `action_required`.
