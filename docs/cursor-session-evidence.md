# Cursor session evidence

PRTruth can normalize concrete terminal-command evidence from Cursor-style JSONL session exports.

## Evidence boundary

The adapter only records command/tool events that contain a concrete shell or terminal command. Assistant prose, file reads, edits, searches, and other non-command tools are ignored.

A command is `success` only when an explicit zero exit code or a conclusive success status is present. A non-zero exit code or conclusive failure status becomes `failure`. Missing or in-progress outcomes remain `unknown`.

This keeps session telemetry useful without treating an agent's narrative claim as proof.

## Supported shapes

The parser accepts common top-level and nested fields such as:

- `command` / `cmd`
- `input.command` / `args.command`
- `exitCode` / `exit_code`
- `output.exitCode` / `result.exitCode`
- `cwd` / `input.cwd` / `args.cwd`
- `timestamp` / `time`

The normalized evidence source is always `cursor-session`.

## Scope

This adapter only normalizes Cursor session commands. Matching those commands to acceptance criteria or completion claims remains a separate verification step.
