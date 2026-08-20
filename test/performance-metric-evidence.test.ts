import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("performance metric evidence", () => {
  it("keeps exact binary-size and startup metrics unproven from a green performance build step", () => {
    const assessment = assessCompletionClaim(
      "zig build perf: 548.9 KiB binary, 0.7 ms mean startup, budget passed",
      [check("check / Size and startup budget / Run zig build perf", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated value");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "check / Size and startup budget / Run zig build perf"
    ]);
  });

  it("keeps size-first and latency-first quantitative wording conservative", () => {
    expect(
      assessCompletionClaim(
        "Build passes with binary size 612 KB",
        [check("build", "success")]
      ).status
    ).toBe("UNPROVEN");

    expect(
      assessCompletionClaim(
        "Build passes with startup latency 12.4 ms",
        [check("build", "success")]
      ).status
    ).toBe("UNPROVEN");
  });

  it("preserves failure precedence for an exact performance claim", () => {
    const assessment = assessCompletionClaim(
      "zig build perf: 548.9 KiB binary, 0.7 ms mean startup, budget passed",
      [check("build perf", "failure")]
    );

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("build perf");
  });

  it("does not weaken an unquantified build-success claim", () => {
    expect(
      assessCompletionClaim("Build passes", [check("build", "success")]).status
    ).toBe("PROVEN");
  });
});
