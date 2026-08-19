import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("scoped CI completion claims", () => {
  it("does not prove a Windows build claim from a generic Linux build", () => {
    const assessment = assessCompletionClaim("Build passes on Windows", [
      check("build / linux", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("windows");
    expect(assessment.matchedChecks).toEqual([]);
  });

  it("proves a platform-scoped claim when the matching check carries that scope", () => {
    const assessment = assessCompletionClaim("Build passes on Windows", [
      check("build / windows", "success"),
      check("build / linux", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["build / windows"]);
  });

  it("proves a multi-OS claim from separate matrix jobs", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux and Windows", [
      check("tests / linux", "success"),
      check("tests / windows", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "tests / windows",
      "tests / linux"
    ]);
  });

  it("keeps a multi-OS claim unproven when one matrix platform is missing", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux and Windows", [
      check("tests / linux", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("windows");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / linux"]);
  });

  it("requires every declared architecture and operating-system scope", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux ARM64", [
      check("tests / linux x64", "success"),
      check("tests / linux arm64", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / linux arm64"]);
  });

  it("requires the Cartesian product for OS and architecture matrices", () => {
    const complete = assessCompletionClaim("Tests pass on Linux and Windows on ARM64 and x64", [
      check("tests / linux arm64", "success"),
      check("tests / linux x64", "success"),
      check("tests / windows arm64", "success"),
      check("tests / windows x64", "success")
    ]);
    const incomplete = assessCompletionClaim("Tests pass on Linux and Windows on ARM64 and x64", [
      check("tests / linux arm64", "success"),
      check("tests / linux x64", "success"),
      check("tests / windows x64", "success")
    ]);

    expect(complete.status).toBe("PROVEN");
    expect(incomplete.status).toBe("UNPROVEN");
    expect(incomplete.matchedChecks).toHaveLength(3);
  });

  it("keeps an architecture-scoped claim unproven when check names omit the architecture", () => {
    const assessment = assessCompletionClaim("Tests pass on ARM64", [
      check("unit tests", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("arm64");
  });

  it("still fails when the matching scoped check fails", () => {
    const assessment = assessCompletionClaim("Tests pass on macOS", [
      check("tests / macos", "failure"),
      check("tests / linux", "success")
    ]);

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("tests / macos");
  });
});
