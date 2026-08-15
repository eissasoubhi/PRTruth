import { describe, expect, it } from "vitest";
import { evaluateWithPlugins, type EvidencePlugin } from "../src/evidence-plugin.js";
import type { EvidencePluginContext } from "../src/evidence-plugin.js";

const context: EvidencePluginContext = {
  requirement: { id: "r1", text: "Tests pass", source: "issue-checklist" },
  changedFiles: ["src/example.ts"],
  checks: [],
};

function plugin(id: string, supported: boolean): EvidencePlugin {
  return {
    id,
    name: id,
    supports: () => supported,
    evaluate: () => ({
      status: "PROVEN",
      reason: `${id} matched`,
      evidence: [{ kind: "repository", summary: id }],
    }),
  };
}

describe("evaluateWithPlugins", () => {
  it("uses the first plugin that supports the context", () => {
    const result = evaluateWithPlugins(
      [plugin("first", false), plugin("second", true), plugin("third", true)],
      context,
    );

    expect(result).toEqual({
      status: "PROVEN",
      reason: "second matched",
      evidence: [{ kind: "repository", summary: "second" }],
    });
  });

  it("returns null when no plugin supports the context", () => {
    expect(evaluateWithPlugins([plugin("first", false)], context)).toBeNull();
  });
});
