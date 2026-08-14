export type SessionCommandResult = "success" | "failure" | "unknown";

export interface OpenCodeSessionEvent {
  type: string;
  tool?: string;
  command?: string;
  exitCode?: number;
  status?: string;
  cwd?: string;
  timestamp?: string;
}

export interface OpenCodeSessionEvidence {
  source: "opencode-session";
  command: string;
  result: SessionCommandResult;
  cwd?: string;
  timestamp?: string;
}

const OPENCODE_COMMAND_TOOLS = new Set([
  "bash",
  "shell",
  "terminal",
  "command",
  "run_command"
]);

export function extractOpenCodeSessionEvidence(
  events: readonly OpenCodeSessionEvent[]
): OpenCodeSessionEvidence[] {
  const evidence: OpenCodeSessionEvidence[] = [];

  for (const event of events) {
    if (!isCommandEvent(event)) continue;

    const command = event.command?.trim();
    if (!command) continue;

    evidence.push({
      source: "opencode-session",
      command,
      result: classifyCommandResult(event),
      ...(event.cwd ? { cwd: event.cwd } : {}),
      ...(event.timestamp ? { timestamp: event.timestamp } : {})
    });
  }

  return evidence;
}

export function parseOpenCodeJsonlSession(input: string): OpenCodeSessionEvent[] {
  const events: OpenCodeSessionEvent[] = [];

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid OpenCode session JSONL at line ${index + 1}`);
    }

    if (!isRecord(parsed)) continue;

    const event: OpenCodeSessionEvent = {
      type:
        stringValue(parsed.type) ??
        stringValue(parsed.event) ??
        stringValue(parsed.kind) ??
        "unknown"
    };

    const tool =
      stringValue(parsed.tool) ??
      stringValue(parsed.tool_name) ??
      stringValue(parsed.name);
    const command =
      stringValue(parsed.command) ??
      stringValue(parsed.cmd) ??
      nestedStringValue(parsed, "args", "command") ??
      nestedStringValue(parsed, "arguments", "command") ??
      nestedStringValue(parsed, "input", "command");
    const exitCode =
      numberValue(parsed.exitCode) ??
      numberValue(parsed.exit_code) ??
      nestedNumberValue(parsed, "result", "exitCode") ??
      nestedNumberValue(parsed, "result", "exit_code") ??
      nestedNumberValue(parsed, "output", "exitCode") ??
      nestedNumberValue(parsed, "output", "exit_code");
    const status =
      stringValue(parsed.status) ??
      nestedStringValue(parsed, "result", "status") ??
      nestedStringValue(parsed, "output", "status");
    const cwd =
      stringValue(parsed.cwd) ??
      nestedStringValue(parsed, "args", "cwd") ??
      nestedStringValue(parsed, "arguments", "cwd") ??
      nestedStringValue(parsed, "input", "cwd");
    const timestamp =
      stringValue(parsed.timestamp) ??
      stringValue(parsed.time) ??
      stringValue(parsed.created_at);

    if (tool) event.tool = tool;
    if (command) event.command = command;
    if (exitCode !== undefined) event.exitCode = exitCode;
    if (status) event.status = status;
    if (cwd) event.cwd = cwd;
    if (timestamp) event.timestamp = timestamp;

    events.push(event);
  }

  return events;
}

function isCommandEvent(event: OpenCodeSessionEvent): boolean {
  const type = event.type.toLowerCase();
  const tool = event.tool?.toLowerCase();

  return (
    type.includes("command") ||
    type.includes("shell") ||
    type.includes("terminal") ||
    type.includes("tool") ||
    (tool !== undefined && OPENCODE_COMMAND_TOOLS.has(tool))
  );
}

function classifyCommandResult(event: OpenCodeSessionEvent): SessionCommandResult {
  if (event.exitCode !== undefined) {
    return event.exitCode === 0 ? "success" : "failure";
  }

  const status = event.status?.toLowerCase();
  if (!status) return "unknown";
  if (["success", "succeeded", "completed", "passed"].includes(status)) return "success";
  if (["failure", "failed", "error", "errored"].includes(status)) return "failure";
  return "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nestedStringValue(
  record: Record<string, unknown>,
  objectKey: string,
  valueKey: string
): string | undefined {
  const nested = record[objectKey];
  return isRecord(nested) ? stringValue(nested[valueKey]) : undefined;
}

function nestedNumberValue(
  record: Record<string, unknown>,
  objectKey: string,
  valueKey: string
): number | undefined {
  const nested = record[objectKey];
  return isRecord(nested) ? numberValue(nested[valueKey]) : undefined;
}
