import { describe, expect, it } from "vitest";
import {
  extractOpenCodeSessionEvidence,
  parseOpenCodeJsonlSession
} from "../src/opencode-session.js";

describe("parseOpenCodeJsonlSession", () => {
  it("parses shell command records from JSONL", () => {
    const events = parseOpenCodeJsonlSession([
      JSON.stringify({
        event: "tool_call",
        tool_name: "bash",
        input: { command: "pnpm test", cwd: "/repo" },
        result: { exit_code: 0 },
        created_at: "2026-08-14T22:30:00Z"
      }),
      JSON.stringify({
        type: "command_result",
        cmd: "pnpm build",
        exitCode: 1
      })
    ].join("\n"));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      tool: "bash",
      command: "pnpm test",
      exitCode: 0,
      cwd: "/repo"
    });
    expect(events[1]).toMatchObject({
      command: "pnpm build",
      exitCode: 1
    });
  });

  it("reports the invalid JSONL line number", () => {
    expect(() => parseOpenCodeJsonlSession("{}\nbad-json\n{}"))
      .toThrow("Invalid OpenCode session JSONL at line 2");
  });
});

describe("extractOpenCodeSessionEvidence", () => {
  it("normalizes explicit shell command outcomes", () => {
    const evidence = extractOpenCodeSessionEvidence([
      { type: "tool_call", tool: "bash", command: "pnpm test", exitCode: 0 },
      { type: "command_result", command: "pnpm build", exitCode: 2 },
      { type: "shell_call", command: "pnpm typecheck", status: "running" }
    ]);

    expect(evidence).toEqual([
      { source: "opencode-session", command: "pnpm test", result: "success" },
      { source: "opencode-session", command: "pnpm build", result: "failure" },
      { source: "opencode-session", command: "pnpm typecheck", result: "unknown" }
    ]);
  });

  it("ignores prose and non-command tools", () => {
    const evidence = extractOpenCodeSessionEvidence([
      { type: "assistant_message", command: "tests passed" },
      { type: "tool_call", tool: "read", command: "README.md" },
      { type: "tool_call", tool: "bash" }
    ]);

    expect(evidence).toEqual([]);
  });

  it("keeps inconclusive statuses unknown", () => {
    const evidence = extractOpenCodeSessionEvidence([
      { type: "command_result", command: "pytest", status: "queued" }
    ]);

    expect(evidence[0]?.result).toBe("unknown");
  });

  it("preserves timestamp metadata", () => {
    const evidence = extractOpenCodeSessionEvidence([
      {
        type: "tool_call",
        tool: "terminal",
        command: "go test ./...",
        status: "completed",
        timestamp: "2026-08-14T22:31:00Z"
      }
    ]);

    expect(evidence[0]).toMatchObject({
      result: "success",
      timestamp: "2026-08-14T22:31:00Z"
    });
  });
});
