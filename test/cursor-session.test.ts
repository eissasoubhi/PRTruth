import { describe, expect, it } from "vitest";
import {
  extractCursorSessionEvidence,
  parseCursorJsonlSession
} from "../src/cursor-session.js";

describe("Cursor session evidence", () => {
  it("extracts successful terminal commands", () => {
    const events = parseCursorJsonlSession(
      JSON.stringify({
        type: "tool_call",
        tool: "run_terminal_cmd",
        command: "pnpm test",
        exitCode: 0,
        cwd: "/repo",
        timestamp: "2026-08-14T20:00:00Z"
      })
    );

    expect(extractCursorSessionEvidence(events)).toEqual([
      {
        source: "cursor-session",
        command: "pnpm test",
        result: "success",
        cwd: "/repo",
        timestamp: "2026-08-14T20:00:00Z"
      }
    ]);
  });

  it("extracts nested command and failure result", () => {
    const events = parseCursorJsonlSession(
      JSON.stringify({
        kind: "tool",
        name: "terminal",
        args: { command: "pnpm typecheck", cwd: "/repo" },
        result: { exitCode: 2 }
      })
    );

    expect(extractCursorSessionEvidence(events)).toEqual([
      {
        source: "cursor-session",
        command: "pnpm typecheck",
        result: "failure",
        cwd: "/repo"
      }
    ]);
  });

  it("uses conclusive status when no exit code exists", () => {
    const events = parseCursorJsonlSession(
      JSON.stringify({
        type: "terminal_command",
        command: "npm run build",
        status: "completed"
      })
    );

    expect(extractCursorSessionEvidence(events)[0]?.result).toBe("success");
  });

  it("keeps ambiguous outcomes unknown", () => {
    const events = parseCursorJsonlSession(
      JSON.stringify({
        type: "tool_call",
        tool: "shell",
        command: "pytest",
        status: "running"
      })
    );

    expect(extractCursorSessionEvidence(events)[0]?.result).toBe("unknown");
  });

  it("ignores non-command tools and assistant prose", () => {
    const events = parseCursorJsonlSession(
      [
        JSON.stringify({ type: "assistant", command: "rm -rf /" }),
        JSON.stringify({ type: "tool_call", tool: "read_file", command: "cat README.md" }),
        JSON.stringify({ type: "message", text: "All tests pass" })
      ].join("\n")
    );

    expect(extractCursorSessionEvidence(events)).toEqual([]);
  });

  it("rejects malformed JSONL with a line number", () => {
    expect(() => parseCursorJsonlSession('{"type":"tool_call"}\n{bad')).toThrow(
      "Invalid Cursor session JSONL at line 2"
    );
  });
});
