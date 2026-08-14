# Codex session evidence

PRTruth can normalize concrete command outcomes from Codex-style JSONL session records without treating agent prose as proof.

## Supported evidence

The adapter extracts command events with a concrete command string and preserves:

- command text;
- exit-code-derived `success` / `failure` results;
- `unknown` when no conclusive outcome exists;
- working directory when present;
- timestamp when present.

It accepts common flat and nested fields such as `command`, `cmd`, `input.command`, `exitCode`, `exit_code`, and `output.exit_code`.

## Evidence boundary

A Codex message saying that tests passed is not proof. PRTruth only emits session evidence for command/tool events. A missing exit code or inconclusive status remains `unknown`.

This adapter is intentionally a normalization primitive. Matching normalized command evidence to requirements remains a separate step, so this PR does not overlap the open claim-matching or language-specific evidence adapters.

## Example

```jsonl
{"type":"tool_call","tool":"shell","input":{"command":"pnpm test","cwd":"/repo"},"output":{"exit_code":0}}
{"type":"command_result","cmd":"pnpm build","exitCode":1}
```

The first command becomes successful session evidence; the second becomes failed session evidence.
