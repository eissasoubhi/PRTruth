import { parse } from "yaml";

export interface WorkflowStepSource {
  name: string;
  run: string;
  shell?: string;
}

interface WorkflowStepLike {
  name?: unknown;
  run?: unknown;
  shell?: unknown;
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

/**
 * Extract executable `run:` steps from a GitHub Actions workflow source file.
 *
 * This helper is intentionally fail-closed. A step is returned only when it has
 * an explicit non-empty `name` and executable `run` command. If the same step
 * name appears more than once anywhere in the workflow, all copies are omitted
 * because an observed runtime step could not be bound to one source command
 * unambiguously from its name alone.
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
