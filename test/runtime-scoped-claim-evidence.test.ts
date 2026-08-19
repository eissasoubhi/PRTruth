import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("runtime-scoped CI completion claims", () => {
  it("does not prove a Node 22 claim from a Node 20 check", () => {
    const assessment = assessCompletionClaim("Tests pass on Node 22", [
      check("tests / node 20", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("node 22");
    expect(assessment.matchedChecks).toEqual([]);
  });

  it("proves a Node major-version claim from a matching minor-version matrix job", () => {
    const assessment = assessCompletionClaim("Tests pass on Node.js 22", [
      check("tests / node 22.12.0", "success"),
      check("tests / node 20.19.0", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / node 22.12.0"]);
  });

  it("proves a multi-version Node claim from separate matrix jobs", () => {
    const assessment = assessCompletionClaim("Tests pass on Node 20 and Node 22", [
      check("tests / node 20", "success"),
      check("tests / node 22", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "tests / node 20",
      "tests / node 22"
    ]);
  });

  it("keeps a multi-version runtime claim unproven when one matrix version is missing", () => {
    const assessment = assessCompletionClaim("Tests pass on Node 20 and Node 22", [
      check("tests / node 22", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("node 20");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / node 22"]);
  });

  it("requires the Cartesian product for runtime and database matrices", () => {
    const complete = assessCompletionClaim("Tests pass on Node 20 and Node 22 with PostgreSQL and MySQL", [
      check("tests / node 20 / postgres", "success"),
      check("tests / node 20 / mysql", "success"),
      check("tests / node 22 / postgres", "success"),
      check("tests / node 22 / mysql", "success")
    ]);
    const incomplete = assessCompletionClaim("Tests pass on Node 20 and Node 22 with PostgreSQL and MySQL", [
      check("tests / node 20 / postgres", "success"),
      check("tests / node 20 / mysql", "success"),
      check("tests / node 22 / postgres", "success")
    ]);

    expect(complete.status).toBe("PROVEN");
    expect(incomplete.status).toBe("UNPROVEN");
    expect(incomplete.matchedChecks).toHaveLength(3);
  });

  it("keeps an exact PHP minor-version claim scoped to that minor line", () => {
    const assessment = assessCompletionClaim("Tests pass on PHP 8.3", [
      check("phpunit / php 8.2", "success"),
      check("phpunit / php 8.3", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["phpunit / php 8.3"]);
  });

  it("does not prove Python 3.12 from a generic test job", () => {
    const assessment = assessCompletionClaim("Tests pass on Python 3.12", [
      check("pytest", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("python 3.12");
  });

  it("combines operating-system, architecture, and runtime scopes", () => {
    const assessment = assessCompletionClaim("Build passes on Linux ARM64 with Node 22", [
      check("build / linux arm64 / node 20", "success"),
      check("build / linux x64 / node 22", "success"),
      check("build / linux arm64 / node 22", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "build / linux arm64 / node 22"
    ]);
  });

  it("fails when the matching Go runtime job fails", () => {
    const assessment = assessCompletionClaim("Tests pass on Go 1.24", [
      check("go test / go 1.24", "failure"),
      check("go test / go 1.23", "success")
    ]);

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("go test / go 1.24");
  });
});
