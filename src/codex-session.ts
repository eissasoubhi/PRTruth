export type SessionCommandResult = "success" | "failure" | "unknown";

export interface CodexSessionEvent {
  type: string;
  tool?: string;
  command?: string;
  exitCode?: number;
  status?: string;
  cwd?: string;
  timestamp?: string;
}

export interface CodexSessionEvidence {
  source: "codex-session";
  command: string;
  result: SessionCommandResult;
  cwd?: string;
  timestamp?: string;
}

const CODEX_TOOL_NAMES = new Set(["shell", "exec", "terminal", "command"]);

export function extractCodexSessionEvidence(
  events: readonly CodexSessionEvent[]
): CodexSessionEvidence[] {
  const evidence: CodexSessionEvidence[] = [];

  for (const event of events) {
    if (!isCommandEvent(event)) {
      continue;
    }

    const command = event.command?.trim();
    if (!command) {
      continue;
    }

    evidence.push({
      source: "codex-session",
      command,
      result: classifyCommandResult(event),
      ...(event.cwd ? { cwd: event.cwd } : {}),
      ...(event.timestamp ? { timestamp: event.timestamp } : {})
    });
  }

  return evidence;
}

export function parseCodexJsonlSession(input: string): CodexSessionEvent[] {
  const events: CodexSessionEvent[] = [];

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid Codex session JSONL at line ${index + 1}`);
    }

    if (!isRecord(parsed)) {
      continue;
    }

    const event: CodexSessionEvent = {
      type: stringValue(parsed.type) ?? stringValue(parsed.kind) ?? "unknown"
    };

    const tool = stringValue(parsed.tool) ?? stringValue(parsed.name);
    const command =
      stringValue(parsed.command) ??
      stringValue(parsed.cmd) ??
      nestedStringValue(parsed, "input", "command");
    const exitCode =
      numberValue(parsed.exitCode) ??
      numberValue(parsed.exit_code) ??
      nestedNumberValue(parsed, "output", "exitCode") ??
      nestedNumberValue(parsed, "output", "exit_code");
    const status = stringValue(parsed.status);
    const cwd = stringValue(parsed.cwd) ?? nestedStringValue(parsed, "input", "cwd");
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

function isCommandEvent(event: CodexSessionEvent): boolean {
  const type = event.type.toLowerCase();
  const tool = event.tool?.toLowerCase();

  return (
    type.includes("command") ||
    type.includes("tool") ||
    (tool !== undefined && CODEX_TOOL_NAMES.has(tool))
  );
}

function classifyCommandResult(event: CodexSessionEvent): SessionCommandResult {
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
