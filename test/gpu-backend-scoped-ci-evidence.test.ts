import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion = "success"): CheckRunSummary {
  return {
    name,
    conclusion,
    status: "completed",
    scope: "check"
  };
}

describe("GPU-backend scoped generic CI evidence", () => {
  it("does not prove CUDA and ROCm coverage from only a CUDA lane", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on CUDA and ROCm",
      [check("CUDA tests")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rocm");
  });

  it("proves CUDA and ROCm coverage when both backend lanes are visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on CUDA and ROCm",
      [check("CUDA tests"), check("ROCm tests")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("treats a named GPU backend as stronger evidence than a generic gpu token", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on ROCm GPU runners",
      [check("ROCm integration")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("composes GPU backend with accelerator model", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on CUDA and ROCm with H100 and H200",
      [
        check("CUDA / H100"),
        check("CUDA / H200"),
        check("ROCm / H100")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("h200 + rocm");
  });
});
