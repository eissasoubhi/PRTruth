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

  it("requires every declared architecture and operating-system scope", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux ARM64", [
      check("tests / linux x64", "success"),
      check("tests / linux arm64", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / linux arm64"]);
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
