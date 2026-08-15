# Claude Code session evidence

PRTruth can normalize concrete command evidence from Claude Code-style JSONL session records.

The adapter intentionally keeps a narrow evidence boundary:

- Bash/shell-style tool calls with an explicit command are eligible.
- Exit code `0` is `success`; a non-zero exit code is `failure`.
- Explicit error flags or conclusive failure statuses are `failure`.
- In-progress, queued, or otherwise inconclusive outcomes stay `unknown`.
- `is_error: false` alone is not enough to claim success.
- Read/edit/search tools and assistant prose are ignored even when they contain text that looks like a command or result.

This adapter only normalizes session evidence. It does not yet match commands to requirements or upgrade a verification verdict on its own.
