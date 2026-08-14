import { describe, expect, it } from "vitest";
import {
  extractGeminiCliSessionEvidence,
  parseGeminiCliJsonlSession
} from "../src/gemini-cli-session.js";

describe("parseGeminiCliJsonlSession", () => {
  it("parses run_shell_command records from JSONL", () => {
    const events = parseGeminiCliJsonlSession([
      JSON.stringify({
        event: "tool_call",
        tool_name: "run_shell_command",
        args: { command: "pnpm test", cwd: "/repo" },
        result: { exit_code: 0 },
        created_at: "2026-08-14T22:00:00Z"
      }),
      JSON.stringify({
        type: "command_result",
        cmd: "pnpm build",
        exitCode: 1
      })
    ].join("\n"));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      tool: "run_shell_command",
      command: "pnpm test",
      exitCode: 0,
      cwd: "/repo"
    });
    expect(events[1]).toMatchObject({
      command: "pnpm build",
      exitCode: 1
    });
  });

  it("reports the bad JSONL line number", () => {
    expect(() => parseGeminiCliJsonlSession("{}\nnot-json\n{}"))
      .toThrow("Invalid Gemini CLI session JSONL at line 2");
  });
});

describe("extractGeminiCliSessionEvidence", () => {
  it("normalizes explicit shell command outcomes", () => {
    const evidence = extractGeminiCliSessionEvidence([
      { type: "tool_call", tool: "run_shell_command", command: "pnpm test", exitCode: 0 },
      { type: "command_result", command: "pnpm build", exitCode: 2 },
      { type: "shell_call", command: "pnpm typecheck", status: "running" }
    ]);

    expect(evidence).toEqual([
      { source: "gemini-cli-session", command: "pnpm test", result: "success" },
      { source: "gemini-cli-session", command: "pnpm build", result: "failure" },
      { source: "gemini-cli-session", command: "pnpm typecheck", result: "unknown" }
    ]);
  });

  it("ignores prose and non-shell tools", () => {
    const evidence = extractGeminiCliSessionEvidence([
      { type: "assistant_message", command: "tests passed" },
      { type: "tool_call", tool: "read_file", command: "README.md" },
      { type: "tool_call", tool: "run_shell_command" }
    ]);

    expect(evidence).toEqual([]);
  });

  it("keeps inconclusive statuses unknown", () => {
    const evidence = extractGeminiCliSessionEvidence([
      { type: "command_result", command: "pytest", status: "queued" }
    ]);

    expect(evidence[0]?.result).toBe("unknown");
  });
});
