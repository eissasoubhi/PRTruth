import { parse } from "yaml";

export interface WorkflowStepSource {
  name: string;
  run: string;
  shell?: string;
}

export interface ObservedWorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface BoundWorkflowStepSource extends WorkflowStepSource {
  workflowPath: string;
  status: string;
  conclusion: string | null;
}

export interface SuccessfulWorkflowCommandProvenance extends WorkflowStepSource {
  workflowPath: string;
}

export interface WorkflowSourceBindingInput {
  expectedHeadSha: string;
  runHeadSha: string;
  workflowPath: string;
  sourcePath: string;
  source: string;
  observedSteps: ObservedWorkflowStep[];
}

interface WorkflowStepLike {
  name?: unknown;
  run?: unknown;
  shell?: unknown;
  "continue-on-error"?: unknown;
}

interface WorkflowJobLike {
  steps?: unknown;
}

interface WorkflowDocumentLike {
  jobs?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizedStepName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizedWorkflowPath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

function isWorkflowPath(path: string): boolean {
  return /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path);
}

function hasExplicitFailureSuppression(run: string): boolean {
  const normalized = run.replace(/\r\n/g, "\n");

  return (
    /\|\|/.test(normalized) ||
    /(^|\n)\s*set\s+\+e(?:\s|$)/i.test(normalized) ||
    /(?:^|[;\n])\s*(?:true|:|exit\s+0)\s*(?:$|[;\n])/i.test(normalized) ||
    /(^|\n)\s*(?:if|while|until)\b[\s\S]*?\b(?:then|do)\b[\s\S]*?\b(?:fi|done)\b\s*(?:$|\n)/im.test(normalized) ||
    /(^|\n)\s*case\b[\s\S]*?\besac\b\s*(?:$|\n)/im.test(normalized)
  );
}

/**
 * Extract executable `run:` steps from a GitHub Actions workflow source file.
 *
 * This helper is intentionally fail-closed. A step is returned only when it has
 * an explicit non-empty `name` and executable `run` command. If the same step
 * name appears more than once anywhere in the workflow, all copies are omitted
 * because an observed runtime step could not be bound to one source command
 * unambiguously from its name alone. Steps with `continue-on-error` are omitted
 * unless that value is explicitly boolean `false`; dynamic expressions are
 * treated as ambiguous rather than assumed to be strict.
 *
 * Parsing source is provenance enrichment only. Callers must still bind the
 * workflow file to the exact executed workflow run and exact PR head before
 * treating any returned command as observable evidence.
 */
export function extractUniqueExecutableWorkflowSteps(source: string): WorkflowStepSource[] {
  let parsed: unknown;
  try {
    parsed = parse(source);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object") return [];
  const jobs = (parsed as WorkflowDocumentLike).jobs;
  if (!jobs || typeof jobs !== "object" || Array.isArray(jobs)) return [];

  const candidates: WorkflowStepSource[] = [];
  const counts = new Map<string, number>();

  for (const job of Object.values(jobs as Record<string, WorkflowJobLike>)) {
    if (!job || typeof job !== "object" || !Array.isArray(job.steps)) continue;

    for (const rawStep of job.steps) {
      if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) continue;
      const step = rawStep as WorkflowStepLike;
      const name = nonEmptyString(step.name);
      const run = nonEmptyString(step.run);
      if (!name || !run) continue;

      const continueOnError = step["continue-on-error"];
      if (continueOnError !== undefined && continueOnError !== false) continue;

      const shell = nonEmptyString(step.shell);
      const candidate: WorkflowStepSource = {
        name,
        run,
        ...(shell ? { shell } : {})
      };
      candidates.push(candidate);

      const key = normalizedStepName(name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return candidates.filter((candidate) => counts.get(normalizedStepName(candidate.name)) === 1);
}

/**
 * Bind observed runtime step names to executable commands from the exact
 * workflow source that produced them.
 *
 * The binding deliberately refuses to guess. It returns no provenance unless:
 * - the workflow run head is exactly the PR head being verified;
 * - the fetched source path is exactly the workflow path reported by the run;
 * - the path is a normal `.github/workflows/*.yml|yaml` file;
 * - both source and runtime step names are unique after normalization.
 *
 * This still does not make a command successful evidence by itself. Consumers
 * must separately interpret the observed runtime status/conclusion and apply
 * the existing evidence semantics.
 */
export function bindExecutedWorkflowStepsToSource(
  input: WorkflowSourceBindingInput
): BoundWorkflowStepSource[] {
  const expectedHeadSha = input.expectedHeadSha.trim();
  const runHeadSha = input.runHeadSha.trim();
  if (!expectedHeadSha || runHeadSha !== expectedHeadSha) return [];

  const workflowPath = normalizedWorkflowPath(input.workflowPath);
  const sourcePath = normalizedWorkflowPath(input.sourcePath);
  if (!isWorkflowPath(workflowPath) || workflowPath !== sourcePath) return [];

  const sourceSteps = extractUniqueExecutableWorkflowSteps(input.source);
  if (sourceSteps.length === 0) return [];

  const observedCounts = new Map<string, number>();
  for (const step of input.observedSteps) {
    const name = nonEmptyString(step.name);
    if (!name) continue;
    const key = normalizedStepName(name);
    observedCounts.set(key, (observedCounts.get(key) ?? 0) + 1);
  }

  const observedByName = new Map<string, ObservedWorkflowStep>();
  for (const step of input.observedSteps) {
    const name = nonEmptyString(step.name);
    if (!name) continue;
    const key = normalizedStepName(name);
    if (observedCounts.get(key) === 1) {
      observedByName.set(key, step);
    }
  }

  return sourceSteps.flatMap((sourceStep) => {
    const observed = observedByName.get(normalizedStepName(sourceStep.name));
    if (!observed) return [];
    return [{
      ...sourceStep,
      workflowPath,
      status: observed.status,
      conclusion: observed.conclusion
    }];
  });
}

/**
 * Project exact source/runtime bindings into successful command provenance.
 *
 * This is intentionally narrower than the binding above: only runtime steps
 * that GitHub reports as both `completed` and `success` survive. Queued,
 * in-progress, skipped, neutral, cancelled, timed-out, action-required, and
 * failed steps are omitted rather than interpreted as successful execution.
 * Commands with explicit shell-level failure suppression such as `||`,
 * `set +e`, unconditional success tails (`true`, `:`, `exit 0`), or shell
 * control-flow blocks (`if`, `while`, `until`, `case`) are also omitted because
 * a green step does not establish that every command evaluated inside those
 * constructs succeeded.
 *
 * This helper is still provenance only. Feeding these commands into verdict
 * evaluation remains a separate change so command semantics can be reviewed
 * independently before any new `PROVEN` path exists.
 */
export function successfulWorkflowCommandProvenance(
  bindings: BoundWorkflowStepSource[]
): SuccessfulWorkflowCommandProvenance[] {
  return bindings.flatMap((binding) => {
    if (
      binding.status !== "completed" ||
      binding.conclusion !== "success" ||
      hasExplicitFailureSuppression(binding.run)
    ) {
      return [];
    }

    return [{
      name: binding.name,
      run: binding.run,
      ...(binding.shell ? { shell: binding.shell } : {}),
      workflowPath: binding.workflowPath
    }];
  });
}
