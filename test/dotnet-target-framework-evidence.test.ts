import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null = "success",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status };
}

describe(".NET target framework evidence", () => {
  it("requires every explicitly claimed target framework lane", () => {
    const assessment = assessCompletionClaim(
      "2973 unit tests pass on net8.0 and net10.0",
      [check("unit tests / net8.0")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("dotnet net10.0");
  });

  it("proves a multi-target test claim when all target lanes are visible and green", () => {
    const assessment = assessCompletionClaim(
      "2973 unit tests pass on net8.0 and net10.0",
      [check("unit tests / net8.0"), check("unit tests / net10.0")]
    );

    expect(assessment.status).toBe("PROVEN");
  });

  it("does not let a generic green test job prove an explicit target framework", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on net48",
      [check("unit tests")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("dotnet net48");
  });

  it("supports compact .NET Framework target monikers", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on net471 and net48",
      [check("tests / net471"), check("tests / net48")]
    );

    expect(assessment.status).toBe("PROVEN");
  });

  it("composes target frameworks with OS scope", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on net48 and net8.0 on Windows",
      [check("Windows tests / net48"), check("Windows tests / net8.0")]
    );

    expect(assessment.status).toBe("PROVEN");
  });

  it("keeps a TFM and OS matrix unproven when one lane is missing", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on net48 and net8.0 on Windows and Linux",
      [
        check("Windows tests / net48"),
        check("Windows tests / net8.0"),
        check("Linux tests / net48")
      ]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("dotnet net8.0");
    expect(assessment.reason).toContain("linux");
  });
});
