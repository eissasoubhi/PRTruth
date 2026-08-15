import { describe, expect, it } from "vitest";
import {
  extractCopilotSessionEvidence,
  parseCopilotJsonlSession
} from "../src/copilot-session.js";

describe("parseCopilotJsonlSession", () => {
  it("parses common terminal command fields from JSONL", () => {
    const events = parseCopilotJsonlSession([
      JSON.stringify({
        event: "tool_call",
        toolName: "run_in_terminal",
        arguments: { command: "pnpm test", cwd: "/repo" },
        result: { exitCode: 0 },
        createdAt: "2026-08-14T22:00:00Z"
      }),
      JSON.stringify({
        type: "command_result",
        cmd: "pnpm build",
        exit_code: 2
      })
    ].join("\n"));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      tool: "run_in_terminal",
      command: "pnpm test",
      exitCode: 0,
      cwd: "/repo"
    });
    expect(events[1]).toMatchObject({
      command: "pnpm build",
      exitCode: 2
    });
  });

  it("reports the bad JSONL line number", () => {
    expect(() => parseCopilotJsonlSession("{}\nnot-json\n{}"))
      .toThrow("Invalid Copilot session JSONL at line 2");
  });
});

describe("extractCopilotSessionEvidence", () => {
  it("normalizes explicit command outcomes", () => {
    const evidence = extractCopilotSessionEvidence([
      { type: "tool_call", tool: "run_in_terminal", command: "pnpm test", exitCode: 0 },
      { type: "command_result", command: "pnpm build", exitCode: 1 },
      { type: "terminal_call", command: "pnpm typecheck", status: "running" }
    ]);

    expect(evidence).toEqual([
      { source: "copilot-session", command: "pnpm test", result: "success" },
      { source: "copilot-session", command: "pnpm build", result: "failure" },
      { source: "copilot-session", command: "pnpm typecheck", result: "unknown" }
    ]);
  });

  it("ignores prose and non-command tools", () => {
    const evidence = extractCopilotSessionEvidence([
      { type: "assistant_message", command: "tests passed" },
      { type: "tool_call", tool: "read_file", command: "README.md" },
      { type: "tool_call", tool: "run_in_terminal" }
    ]);

    expect(evidence).toEqual([]);
  });

  it("does not infer success from an inconclusive status", () => {
    const evidence = extractCopilotSessionEvidence([
      { type: "command_result", command: "npm test", status: "queued" }
    ]);

    expect(evidence[0]?.result).toBe("unknown");
  });
});
