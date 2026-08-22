import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("Spectral CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Spectral claim", () => {
    const assessment = assessGenericCiSuccess(
      "Spectral lint passes with no errors",
      [check("API CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Spectral only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Spectral lint passes with no errors",
      [check("API CI / Lint OpenAPI spec / spectral lint openapi/spec.yaml", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Spectral setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Spectral lint passes with no errors",
      [check("Install Spectral", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Spectral evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "Spectral lint passes with no errors",
      [check("Lint OpenAPI spec / spectral lint openapi/spec.yaml", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toMatch(/spectral/i);
  });
});
