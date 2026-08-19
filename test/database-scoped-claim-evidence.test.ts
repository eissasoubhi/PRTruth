import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("database-scoped CI completion claims", () => {
  it("does not prove a PostgreSQL claim from a MySQL job", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL", [
      check("tests / mysql", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("postgres");
    expect(assessment.matchedChecks).toEqual([]);
  });

  it("proves a single database claim from the matching job", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL", [
      check("tests / postgres", "success"),
      check("tests / mysql", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual(["tests / postgres"]);
  });

  it("aggregates a multi-database claim across separate matrix jobs", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL, MySQL and SQLite", [
      check("tests / postgres", "success"),
      check("tests / mysql", "success"),
      check("tests / sqlite", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "tests / postgres",
      "tests / mysql",
      "tests / sqlite"
    ]);
  });

  it("keeps a multi-database claim unproven when one required database is missing", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL, MySQL and SQLite", [
      check("tests / postgres", "success"),
      check("tests / mysql", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("sqlite");
  });

  it("fails a multi-database claim when one required database job fails", () => {
    const assessment = assessCompletionClaim("Tests pass on PostgreSQL and MySQL", [
      check("tests / postgres", "success"),
      check("tests / mysql", "failure")
    ]);

    expect(assessment.status).toBe("FAILED");
    expect(assessment.reason).toContain("tests / mysql");
  });

  it("combines database aggregation with runtime and platform scope", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Linux ARM64 with Node 22 on PostgreSQL and MySQL",
      [
        check("tests / linux arm64 / node 22 / postgres", "success"),
        check("tests / linux arm64 / node 20 / mysql", "success"),
        check("tests / linux arm64 / node 22 / mysql", "success"),
        check("tests / linux x64 / node 22 / postgres", "success")
      ]
    );

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "tests / linux arm64 / node 22 / postgres",
      "tests / linux arm64 / node 22 / mysql"
    ]);
  });

  it("recognizes MariaDB and SQLite3 aliases", () => {
    const assessment = assessCompletionClaim("Tests pass on MariaDB and SQLite3", [
      check("tests / mariadb", "success"),
      check("tests / sqlite3", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
  });
});
