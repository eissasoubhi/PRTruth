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

describe("accelerator-scoped generic CI evidence", () => {
  it("does not prove an H100 and H200 GPU claim from only an H100 lane", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on H100 and H200 GPU runners",
      [check("GPU tests / H100")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("h200");
  });

  it("proves a multi-accelerator claim when every named accelerator lane is visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on H100 and H200 GPU runners",
      [
        check("H100 tests"),
        check("H200 tests")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("treats a specific accelerator model as stronger evidence than a generic gpu token", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on H100 GPU runners",
      [check("H100 / integration")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("recognizes RTX PRO 6000 runner labels used by public GPU fleets", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on RTX PRO 6000 GPU runners",
      [check("vss-skill-eval-gpu-rtxpro6000bw-1")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("keeps accelerator lanes as a matrix axis with runtime versions", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on H100 and B200 with Node 22 and Node 24",
      [
        check("H100 / Node 22"),
        check("H100 / Node 24"),
        check("B200 / Node 22")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("b200 + node 24");
  });
});
