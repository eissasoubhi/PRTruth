# OpenCode session evidence

PRTruth can normalize concrete shell-command evidence exported from OpenCode-style JSONL session records.

The adapter recognizes command-capable tools such as `bash`, `shell`, `terminal`, `command`, and `run_command`, and extracts the command plus optional working-directory and timestamp metadata.

## Evidence semantics

- explicit exit code `0` => `success`
- explicit non-zero exit code => `failure`
- conclusive statuses such as `success`, `completed`, `failed`, or `error` are mapped conservatively
- incomplete statuses such as `queued` or `running` remain `unknown`
- assistant prose and read/edit/search tool activity are not treated as executable proof

This adapter only normalizes session evidence. It does not by itself prove a requirement or alter the final PRTruth verdict; matching normalized commands to requirements belongs to a separate verification layer.
