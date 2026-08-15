import { describe, expect, it } from "vitest";
import {
  extractCodexSessionEvidence,
  parseCodexJsonlSession
} from "../src/codex-session.js";

describe("parseCodexJsonlSession", () => {
  it("parses common command fields from JSONL", () => {
    const events = parseCodexJsonlSession([
      JSON.stringify({
        type: "tool_call",
        tool: "shell",
        input: { command: "pnpm test", cwd: "/repo" },
        output: { exit_code: 0 },
        timestamp: "2026-08-14T20:00:00Z"
      }),
      JSON.stringify({
        kind: "command_result",
        cmd: "pnpm build",
        exitCode: 1
      })
    ].join("\n"));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      tool: "shell",
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
    expect(() => parseCodexJsonlSession("{}\nnot-json\n{}"))
      .toThrow("Invalid Codex session JSONL at line 2");
  });
});

describe("extractCodexSessionEvidence", () => {
  it("turns command outcomes into normalized evidence", () => {
    const evidence = extractCodexSessionEvidence([
      { type: "tool_call", tool: "shell", command: "pnpm test", exitCode: 0 },
      { type: "command_result", command: "pnpm build", exitCode: 2 },
      { type: "tool_call", tool: "exec", command: "pnpm typecheck", status: "running" }
    ]);

    expect(evidence).toEqual([
      { source: "codex-session", command: "pnpm test", result: "success" },
      { source: "codex-session", command: "pnpm build", result: "failure" },
      { source: "codex-session", command: "pnpm typecheck", result: "unknown" }
    ]);
  });

  it("ignores prose and non-command tools", () => {
    const evidence = extractCodexSessionEvidence([
      { type: "assistant_message", command: "pnpm test" },
      { type: "tool_call", tool: "read_file", command: "README.md" },
      { type: "tool_call", tool: "shell" },
      { type: "note", command: "tests passed" }
    ]);

    expect(evidence).toEqual([]);
  });

  it("does not upgrade an unknown outcome to success", () => {
    const evidence = extractCodexSessionEvidence([
      { type: "command_result", command: "npm test", status: "queued" }
    ]);

    expect(evidence[0]?.result).toBe("unknown");
  });
});
