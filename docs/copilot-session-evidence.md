# GitHub Copilot session evidence

PRTruth can normalize command evidence from GitHub Copilot-style JSONL session exports without treating assistant prose as proof.

## Evidence boundary

The adapter only records events that contain a concrete terminal/shell command and an explicit command-oriented event/tool signal.

A command is classified as:

- `success` when an explicit exit code is `0`, or a conclusive success status is present;
- `failure` when an explicit non-zero exit code is present, or a conclusive failure status is present;
- `unknown` when execution is queued, running, or otherwise inconclusive.

Read/edit/search tools and assistant messages are ignored, even when their text contains phrases such as “tests passed”. This prevents narrative output from becoming verification evidence.

## Scope

This module normalizes session evidence only. It does not yet decide which requirement a command proves and does not modify the final PRTruth verdict.
