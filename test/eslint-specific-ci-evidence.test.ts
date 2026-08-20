import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("ESLint-specific CI evidence", () => {
  it("does not prove ESLint from a generic lint step", () => {
    const assessment = assessCompletionClaim("ESLint on modified files: passed", [
      check("Frontend / Run npm run lint", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("lint");
  });

  it("proves ESLint when the successful evidence names ESLint", () => {
    const assessment = assessCompletionClaim("ESLint on modified files: passed", [
      check("Frontend / Run npx eslint src", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
  });

  it("fails ESLint when matching ESLint evidence fails", () => {
    const assessment = assessCompletionClaim("ESLint passes", [
      check("Frontend / ESLint", "failure")
    ]);

    expect(assessment.status).toBe("FAILED");
  });

  it("requires both ESLint and typecheck evidence for a composite claim", () => {
    const assessment = assessCompletionClaim("ESLint and typecheck pass", [
      check("Frontend / Run npm run lint", "success"),
      check("Frontend / typecheck", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
  });
});
