import { describe, expect, it } from "vitest";
import {
  extractClaudeCodeSessionEvidence,
  parseClaudeCodeJsonlSession
} from "../src/claude-code-session.js";

describe("parseClaudeCodeJsonlSession", () => {
  it("parses Bash tool_use commands from Claude-style message content", () => {
    const events = parseClaudeCodeJsonlSession(JSON.stringify({
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "pnpm test", cwd: "/repo" }
          }
        ]
      },
      timestamp: "2026-08-14T21:00:00Z"
    }));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      tool: "Bash",
      command: "pnpm test",
      cwd: "/repo"
    });
  });

  it("reports malformed JSONL with its line number", () => {
    expect(() => parseClaudeCodeJsonlSession("{}\nnot-json\n{}"))
      .toThrow("Invalid Claude Code session JSONL at line 2");
  });
});

describe("extractClaudeCodeSessionEvidence", () => {
  it("normalizes explicit command outcomes conservatively", () => {
    const evidence = extractClaudeCodeSessionEvidence([
      { type: "tool_use", tool: "Bash", command: "pnpm test", exitCode: 0 },
      { type: "tool_result", tool: "Bash", command: "pnpm build", isError: true },
      { type: "tool_use", tool: "Bash", command: "pnpm typecheck", status: "running" }
    ]);

    expect(evidence).toEqual([
      { source: "claude-code-session", command: "pnpm test", result: "success" },
      { source: "claude-code-session", command: "pnpm build", result: "failure" },
      { source: "claude-code-session", command: "pnpm typecheck", result: "unknown" }
    ]);
  });

  it("ignores non-command tools and prose", () => {
    const evidence = extractClaudeCodeSessionEvidence([
      { type: "assistant", command: "tests passed" },
      { type: "tool_use", tool: "Read", command: "README.md" },
      { type: "tool_use", tool: "Bash" }
    ]);

    expect(evidence).toEqual([]);
  });

  it("does not infer success from a non-error flag alone", () => {
    const evidence = extractClaudeCodeSessionEvidence([
      { type: "tool_result", tool: "Bash", command: "npm test", isError: false }
    ]);

    expect(evidence[0]?.result).toBe("unknown");
  });
});
