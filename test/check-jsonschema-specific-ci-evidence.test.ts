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

describe("check-jsonschema CI evidence", () => {
  it("does not let unrelated green CI prove an explicit check-jsonschema claim", () => {
    const assessment = assessGenericCiSuccess(
      "check-jsonschema validation passes for the issue forms",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves check-jsonschema only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "check-jsonschema validation passes for the issue forms",
      [check("ci / jsonschema", "success"), check("Validate issue forms", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores check-jsonschema setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "check-jsonschema validation passes for the issue forms",
      [check("Install check-jsonschema", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit check-jsonschema evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "check-jsonschema validation passes for the issue forms",
      [check("ci / jsonschema", "failure")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toMatch(/jsonschema/i);
  });
});
