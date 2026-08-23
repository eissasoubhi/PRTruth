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

describe("Zizmor CI evidence", () => {
  it("does not let unrelated green CI prove an explicit Zizmor claim", () => {
    const assessment = assessGenericCiSuccess(
      "Zizmor reports no findings for the GitHub Actions configuration",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves Zizmor only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Zizmor reports no findings for the GitHub Actions configuration",
      [
        check("ci / actions", "success"),
        check("Run zizmorcore/zizmor-action@3dc1ecc9bcb9e94e9b2c709687979e1298497054", "success", "step"),
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores Zizmor setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "Zizmor reports no findings for the GitHub Actions configuration",
      [check("Install zizmor", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit Zizmor evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "Zizmor reports no findings for the GitHub Actions configuration",
      [check("Run zizmorcore/zizmor-action@3dc1ecc9bcb9e94e9b2c709687979e1298497054", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toMatch(/zizmor/i);
  });
});
