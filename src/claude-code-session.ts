export type ClaudeCommandResult = "success" | "failure" | "unknown";

export interface ClaudeCodeSessionEvent {
  type: string;
  tool?: string;
  command?: string;
  exitCode?: number;
  isError?: boolean;
  status?: string;
  cwd?: string;
  timestamp?: string;
}

export interface ClaudeCodeSessionEvidence {
  source: "claude-code-session";
  command: string;
  result: ClaudeCommandResult;
  cwd?: string;
  timestamp?: string;
}

const CLAUDE_COMMAND_TOOLS = new Set(["bash", "shell", "terminal", "exec", "command"]);

export function extractClaudeCodeSessionEvidence(
  events: readonly ClaudeCodeSessionEvent[]
): ClaudeCodeSessionEvidence[] {
  const evidence: ClaudeCodeSessionEvidence[] = [];

  for (const event of events) {
    if (!isConcreteCommandEvent(event)) continue;

    const command = event.command?.trim();
    if (!command) continue;

    evidence.push({
      source: "claude-code-session",
      command,
      result: classifyResult(event),
      ...(event.cwd ? { cwd: event.cwd } : {}),
      ...(event.timestamp ? { timestamp: event.timestamp } : {})
    });
  }

  return evidence;
}

export function parseClaudeCodeJsonlSession(input: string): ClaudeCodeSessionEvent[] {
  const events: ClaudeCodeSessionEvent[] = [];

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid Claude Code session JSONL at line ${index + 1}`);
    }

    if (!isRecord(parsed)) continue;

    const event: ClaudeCodeSessionEvent = {
      type: stringValue(parsed.type) ?? stringValue(parsed.kind) ?? "unknown"
    };

    const message = recordValue(parsed.message);
    const content = Array.isArray(message?.content) ? message.content : undefined;
    const toolUse = content?.find(
      (item): item is Record<string, unknown> =>
        isRecord(item) && stringValue(item.type)?.toLowerCase() === "tool_use"
    );

    const tool =
      stringValue(parsed.tool) ??
      stringValue(parsed.name) ??
      stringValue(toolUse?.name);
    const inputRecord = recordValue(parsed.input) ?? recordValue(toolUse?.input);
    const command =
      stringValue(parsed.command) ??
      stringValue(parsed.cmd) ??
      stringValue(inputRecord?.command);
    const exitCode =
      numberValue(parsed.exitCode) ??
      numberValue(parsed.exit_code) ??
      nestedNumberValue(parsed, "output", "exitCode") ??
      nestedNumberValue(parsed, "output", "exit_code");
    const isError = booleanValue(parsed.is_error) ?? booleanValue(parsed.isError);
    const status = stringValue(parsed.status);
    const cwd = stringValue(parsed.cwd) ?? stringValue(inputRecord?.cwd);
    const timestamp = stringValue(parsed.timestamp) ?? stringValue(parsed.time);

    if (tool) event.tool = tool;
    if (command) event.command = command;
    if (exitCode !== undefined) event.exitCode = exitCode;
    if (isError !== undefined) event.isError = isError;
    if (status) event.status = status;
    if (cwd) event.cwd = cwd;
    if (timestamp) event.timestamp = timestamp;

    events.push(event);
  }

  return events;
}

function isConcreteCommandEvent(event: ClaudeCodeSessionEvent): boolean {
  const tool = event.tool?.toLowerCase();
  const type = event.type.toLowerCase();

  return (
    (tool !== undefined && CLAUDE_COMMAND_TOOLS.has(tool)) ||
    type.includes("command")
  );
}

function classifyResult(event: ClaudeCodeSessionEvent): ClaudeCommandResult {
  if (event.exitCode !== undefined) {
    return event.exitCode === 0 ? "success" : "failure";
  }

  if (event.isError === true) return "failure";

  const status = event.status?.toLowerCase();
  if (!status) return "unknown";
  if (["success", "succeeded", "completed", "passed"].includes(status)) return "success";
  if (["failure", "failed", "error", "errored"].includes(status)) return "failure";
  return "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function nestedNumberValue(
  record: Record<string, unknown>,
  objectKey: string,
  valueKey: string
): number | undefined {
  const nested = recordValue(record[objectKey]);
  return nested ? numberValue(nested[valueKey]) : undefined;
}
