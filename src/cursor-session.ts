export type CursorCommandResult = "success" | "failure" | "unknown";

export interface CursorSessionEvent {
  type: string;
  tool?: string;
  command?: string;
  exitCode?: number;
  status?: string;
  cwd?: string;
  timestamp?: string;
}

export interface CursorSessionEvidence {
  source: "cursor-session";
  command: string;
  result: CursorCommandResult;
  cwd?: string;
  timestamp?: string;
}

const CURSOR_COMMAND_TOOLS = new Set([
  "terminal",
  "shell",
  "run_terminal_cmd",
  "runterminalcmd",
  "command"
]);

export function extractCursorSessionEvidence(
  events: readonly CursorSessionEvent[]
): CursorSessionEvidence[] {
  const evidence: CursorSessionEvidence[] = [];

  for (const event of events) {
    if (!isCommandEvent(event)) continue;

    const command = event.command?.trim();
    if (!command) continue;

    evidence.push({
      source: "cursor-session",
      command,
      result: classifyCommandResult(event),
      ...(event.cwd ? { cwd: event.cwd } : {}),
      ...(event.timestamp ? { timestamp: event.timestamp } : {})
    });
  }

  return evidence;
}

export function parseCursorJsonlSession(input: string): CursorSessionEvent[] {
  const events: CursorSessionEvent[] = [];

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid Cursor session JSONL at line ${index + 1}`);
    }

    if (!isRecord(parsed)) continue;

    const event: CursorSessionEvent = {
      type: stringValue(parsed.type) ?? stringValue(parsed.kind) ?? "unknown"
    };

    const tool =
      stringValue(parsed.tool) ??
      stringValue(parsed.name) ??
      nestedStringValue(parsed, "toolCall", "name");
    const command =
      stringValue(parsed.command) ??
      stringValue(parsed.cmd) ??
      nestedStringValue(parsed, "input", "command") ??
      nestedStringValue(parsed, "args", "command") ??
      nestedStringValue(parsed, "toolCall", "command");
    const exitCode =
      numberValue(parsed.exitCode) ??
      numberValue(parsed.exit_code) ??
      nestedNumberValue(parsed, "output", "exitCode") ??
      nestedNumberValue(parsed, "output", "exit_code") ??
      nestedNumberValue(parsed, "result", "exitCode");
    const status =
      stringValue(parsed.status) ??
      nestedStringValue(parsed, "result", "status");
    const cwd =
      stringValue(parsed.cwd) ??
      nestedStringValue(parsed, "input", "cwd") ??
      nestedStringValue(parsed, "args", "cwd");
    const timestamp = stringValue(parsed.timestamp) ?? stringValue(parsed.time);

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

function isCommandEvent(event: CursorSessionEvent): boolean {
  const type = event.type.toLowerCase();
  const tool = event.tool?.toLowerCase();

  if (tool !== undefined) {
    if (CURSOR_COMMAND_TOOLS.has(tool)) return true;
    if (type.includes("tool")) return false;
  }

  return type.includes("terminal") || type.includes("command");
}

function classifyCommandResult(event: CursorSessionEvent): CursorCommandResult {
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
