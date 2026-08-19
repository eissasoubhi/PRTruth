import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("database-version scoped evidence", () => {
  it("does not prove PostgreSQL 17 tests from a PostgreSQL 16 lane", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL 17", [
      check("tests / PostgreSQL 16", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("postgres 17");
  });

  it("proves a database-version test claim from the exact lane", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL 17", [
      check("tests / PostgreSQL 16", "success"),
      check("tests / PostgreSQL 17", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / PostgreSQL 17"]);
  });

  it("requires every explicitly named database-version lane", () => {
    const complete = assessCompletionClaim("Tests pass on PostgreSQL 16 and PostgreSQL 17", [
      check("tests / PostgreSQL 16", "success"),
      check("tests / PostgreSQL 17", "success")
    ]);
    const incomplete = assessCompletionClaim("Tests pass on PostgreSQL 16 and PostgreSQL 17", [
      check("tests / PostgreSQL 16", "success")
    ]);

    expect(complete.status).toBe("PROVEN");
    expect(incomplete.status).toBe("UNPROVEN");
  });

  it("keeps generic CI version claims distinct", () => {
    const wrongVersion = assessGenericCiSuccess("CI is green on PostgreSQL 17", [
      check("PostgreSQL 16", "success")
    ]);
    const exactVersion = assessGenericCiSuccess("CI is green on PostgreSQL 17", [
      check("PostgreSQL 17", "success")
    ]);

    expect(wrongVersion).toMatchObject({ status: "UNPROVEN" });
    expect(wrongVersion?.reason).toContain("postgres 17");
    expect(exactVersion).toMatchObject({ status: "PROVEN" });
  });

  it("composes database versions with runtime scope", () => {
    const assessment = assessGenericCiSuccess("CI is green on PostgreSQL 16 and PostgreSQL 17 with Node 22", [
      check("PostgreSQL 16 / Node 22", "success"),
      check("PostgreSQL 17 / Node 20", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("postgres 17 + node 22");
  });

  it("preserves family-only database claims", () => {
    expect(assessCompletionClaim("Tests pass on PostgreSQL", [
      check("tests / PostgreSQL 16", "success")
    ]).status).toBe("PROVEN");
  });
});
