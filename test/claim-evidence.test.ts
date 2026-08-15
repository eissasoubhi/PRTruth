import { describe, expect, it } from "vitest";
import { assessCompletionClaim, buildClaimResults } from "../src/claim-evidence.js";
import type { CheckRunSummary, CompletionClaim } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status };
}

describe("assessCompletionClaim", () => {
  it("proves a test claim when every observed test check succeeds", () => {
    const assessment = assessCompletionClaim("All tests pass", [
      check("unit tests", "success"),
      check("integration tests", "success"),
      check("build", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "unit tests",
      "integration tests"
    ]);
  });

  it("fails a test claim when a matching check fails", () => {
    const assessment = assessCompletionClaim("All tests pass", [
      check("unit tests", "success"),
      check("integration tests", "failure")
    ]);

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("integration tests");
  });

  it("keeps a claim unproven while a matching check is still running", () => {
    const assessment = assessCompletionClaim("The build passes", [
      check("build", null, "in_progress")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("has not completed");
  });

  it("does not infer no breaking changes from successful CI", () => {
    const assessment = assessCompletionClaim("No breaking changes", [
      check("unit tests", "success"),
      check("build", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.matchedChecks).toEqual([]);
    expect(assessment.reason).toContain("compatibility evidence");
  });

  it("proves lint and typecheck claims from matching successful checks", () => {
    expect(
      assessCompletionClaim("Lint passes", [check("eslint", "success")]).status
    ).toBe("PROVEN");
    expect(
      assessCompletionClaim("Typecheck passes", [check("typecheck", "success")]).status
    ).toBe("PROVEN");
  });

  it("keeps unsupported broad claims unproven", () => {
    const assessment = assessCompletionClaim("No regressions", [
      check("unit tests", "success"),
      check("build", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("broader");
  });
});

describe("buildClaimResults", () => {
  it("turns extracted claims into report-ready assessments with evidence links", () => {
    const claims: CompletionClaim[] = [
      { id: "claim-1", text: "All tests pass", source: "claim-section" },
      { id: "claim-2", text: "No breaking changes", source: "checked-checklist" }
    ];
    const checks: CheckRunSummary[] = [
      {
        name: "unit tests",
        status: "completed",
        conclusion: "success",
        htmlUrl: "https://github.com/example/repo/actions/runs/1"
      }
    ];

    const results = buildClaimResults(claims, checks);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      claim: claims[0],
      status: "PROVEN",
      evidence: [
        {
          kind: "ci",
          summary: "unit tests: success",
          url: "https://github.com/example/repo/actions/runs/1"
        }
      ]
    });
    expect(results[1]).toMatchObject({
      claim: claims[1],
      status: "UNPROVEN",
      evidence: []
    });
  });
});
