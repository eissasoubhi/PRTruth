# Gemini CLI session evidence

PRTruth can normalize command evidence from Gemini CLI-style JSONL session records while keeping assistant narration outside the proof boundary.

## Evidence boundary

The adapter accepts concrete shell-command events, including `run_shell_command`-style tool calls, and records the command plus any explicit working directory or timestamp metadata.

A command is classified as:

- `success` for exit code `0` or a conclusive success status;
- `failure` for a non-zero exit code or a conclusive failure status;
- `unknown` when the execution is queued, running, or otherwise inconclusive.

Read/edit/search tools and assistant prose are ignored. A textual claim that tests passed is not evidence unless it is backed by a concrete command event with an explicit outcome.

## Scope

This module only normalizes Gemini CLI session evidence. Requirement matching and final verdict integration remain separate work.
