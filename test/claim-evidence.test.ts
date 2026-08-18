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

  it("proves a composite validation claim when all observed workflow steps succeed", () => {
    const assessment = assessCompletionClaim(
      "CI passes install, lint, typecheck, tests and production build",
      [
        check("quality / Run pnpm install --frozen-lockfile", "success"),
        check("quality / Run pnpm lint", "success"),
        check("quality / Run pnpm typecheck", "success"),
        check("quality / Run pnpm test", "success"),
        check("quality / Run pnpm build", "success")
      ]
    );

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks).toHaveLength(5);
  });

  it("keeps a composite validation claim unproven when one stage has no evidence", () => {
    const assessment = assessCompletionClaim(
      "CI passes lint, typecheck, tests and build",
      [
        check("quality / Run pnpm lint", "success"),
        check("quality / Run pnpm typecheck", "success"),
        check("quality / Run pnpm test", "success")
      ]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("build");
  });

  it("keeps a specific test-coverage claim unproven even when tests pass", () => {
    const assessment = assessCompletionClaim(
      "tests for signatures, replay tolerance, duplicate/busy/retry webhook claims, provider event ordering and paid-plan resolution",
      [check("quality / Run pnpm test", "success")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.matchedChecks).toEqual([]);
    expect(assessment.reason).toContain("named behavior is exercised");
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

  it("shows relevant changed files without upgrading an unsupported business claim", () => {
    const claims: CompletionClaim[] = [
      { id: "claim-1", text: "protected dashboard", source: "claim-section" }
    ];

    const [result] = buildClaimResults(claims, [], [
      "apps/web/app/dashboard/page.tsx",
      "apps/web/app/pricing/page.tsx"
    ]);

    expect(result).toMatchObject({
      status: "UNPROVEN",
      reason: "Changed files are relevant, but no deterministic evidence rule currently proves this completion claim.",
      evidence: [
        {
          kind: "diff",
          summary: "Changed file: apps/web/app/dashboard/page.tsx"
        }
      ]
    });
  });

  it("shows candidate test files for a specific coverage claim without treating green CI as proof", () => {
    const claims: CompletionClaim[] = [
      {
        id: "claim-1",
        text: "tests for signatures, replay tolerance, duplicate/busy/retry webhook claims, provider event ordering and paid-plan resolution",
        source: "claim-section"
      }
    ];

    const [result] = buildClaimResults(
      claims,
      [check("quality / Run pnpm test", "success")],
      [
        "apps/web/lib/stripe-webhook.test.ts",
        "packages/db/src/billing.test.ts",
        "README.md"
      ]
    );

    expect(result).toMatchObject({
      status: "UNPROVEN",
      reason: "A specific test-coverage claim requires evidence that the named behavior is exercised, not only a successful test run."
    });
    expect(result?.evidence).toContainEqual({
      kind: "diff",
      summary: "Changed file: apps/web/lib/stripe-webhook.test.ts"
    });
    expect(result?.evidence.some((item) => item.kind === "ci")).toBe(false);
  });

  it("does not weaken explicit compatibility safeguards with filename relevance", () => {
    const claims: CompletionClaim[] = [
      { id: "claim-1", text: "No breaking API changes", source: "claim-section" }
    ];

    const [result] = buildClaimResults(claims, [], ["docs/api-breaking-changes.md"]);

    expect(result).toMatchObject({
      status: "UNPROVEN",
      reason: "A no-breaking-changes claim requires API or schema compatibility evidence, not only CI status.",
      evidence: []
    });
  });
});
