import type { CheckRunSummary, Evidence, EvidenceStatus, Requirement } from "./types.js";

export interface EvidencePluginContext {
  requirement: Requirement;
  changedFiles: readonly string[];
  checks: readonly CheckRunSummary[];
}

export interface EvidencePluginResult {
  status: EvidenceStatus;
  reason: string;
  evidence: Evidence[];
}

export interface EvidencePlugin {
  readonly id: string;
  readonly name: string;
  supports(context: EvidencePluginContext): boolean;
  evaluate(context: EvidencePluginContext): EvidencePluginResult;
}

export function evaluateWithPlugins(
  plugins: readonly EvidencePlugin[],
  context: EvidencePluginContext,
): EvidencePluginResult | null {
  for (const plugin of plugins) {
    if (plugin.supports(context)) {
      return plugin.evaluate(context);
    }
  }

  return null;
}
