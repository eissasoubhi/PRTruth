import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function success(name: string): CheckRunSummary {
  return {
    name,
    status: "completed",
    conclusion: "success",
    scope: "step"
  };
}

describe("workflow job scope evidence", () => {
  it("proves a Linux ARM64 validation claim when structured job labels scope every successful step", () => {
    const prefix = "quality [self-hosted, Linux, ARM64] / ";
    const assessment = assessCompletionClaim(
      "Self-hosted Linux ARM64 CI passes install, lint, typecheck, tests and production build.",
      [
        success(`${prefix}Run pnpm install --no-frozen-lockfile`),
        success(`${prefix}Run pnpm lint`),
        success(`${prefix}Run pnpm typecheck`),
        success(`${prefix}Run pnpm test`),
        success(`${prefix}Run pnpm build`)
      ]
    );

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks).toHaveLength(5);
  });

  it("does not infer runner scope when workflow job labels are absent", () => {
    const assessment = assessCompletionClaim(
      "Linux ARM64 CI passes install, lint, typecheck, tests and production build.",
      [
        success("quality / Run pnpm install --no-frozen-lockfile"),
        success("quality / Run pnpm lint"),
        success("quality / Run pnpm typecheck"),
        success("quality / Run pnpm test"),
        success("quality / Run pnpm build")
      ]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("linux, arm64");
  });
});