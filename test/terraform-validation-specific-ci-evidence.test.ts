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

describe("Terraform validation CI evidence", () => {
  it("does not let unrelated green CI prove explicit Terraform validation tools", () => {
    const assessment = assessGenericCiSuccess(
      "terraform fmt, terraform validate, tflint, and checkov all clean",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves the composite claim only from matching executable evidence for every tool", () => {
    const assessment = assessGenericCiSuccess(
      "terraform fmt, terraform validate, tflint, and checkov all clean",
      [
        check("ci / fmt / terraform fmt -check -recursive", "success", "step"),
        check("ci / validate-matrix (bootstrap) / terraform validate", "success", "step"),
        check("ci / tflint / tflint --recursive", "success", "step"),
        check("ci / checkov / Run checkov", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(4);
  });

  it("keeps the composite claim unproven when one named tool has no evidence", () => {
    const assessment = assessGenericCiSuccess(
      "terraform fmt, terraform validate, tflint, and checkov all clean",
      [
        check("terraform fmt -check -recursive", "success", "step"),
        check("terraform validate", "success", "step"),
        check("tflint --recursive", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("checkov");
  });

  it("fails the composite claim when matching Checkov evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "terraform fmt, terraform validate, tflint, and checkov all clean",
      [
        check("terraform fmt -check -recursive", "success", "step"),
        check("terraform validate", "success", "step"),
        check("tflint --recursive", "success", "step"),
        check("Run checkov", "failure", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("checkov");
  });

  it("ignores setup/install-only evidence for TFLint and Checkov", () => {
    const assessment = assessGenericCiSuccess(
      "tflint and checkov clean",
      [
        check("Setup tflint", "success", "step"),
        check("Install checkov", "success", "step")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });
});
