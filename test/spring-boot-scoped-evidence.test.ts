import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("Spring Boot scoped evidence", () => {
  it("keeps a generic compatibility claim unproven when a Spring Boot lane is missing", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Spring Boot 3.4, Spring Boot 3.5 and Spring Boot 4.0",
      [
        check("Tests / Spring Boot 3.4.13", "success"),
        check("Tests / Spring Boot 3.5.14", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("spring boot 4.0");
  });

  it("proves a generic compatibility claim when every Spring Boot lane is visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Spring Boot 3.4, Spring Boot 3.5 and Spring Boot 4.0",
      [
        check("Tests / Spring Boot 3.4.13", "success"),
        check("Tests / Spring Boot 3.5.14", "success"),
        check("Tests / Spring Boot 4.0.6", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("does not let an unscoped green test job prove an explicit Spring Boot version", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Spring Boot 3.5",
      [check("integration tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("spring-boot 3.5");
  });

  it("proves a scoped test claim from the matching Spring Boot lane", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Spring Boot 3.5",
      [
        check("Tests / Spring Boot 3.4.13", "success"),
        check("Tests / Spring Boot 3.5.14", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "Tests / Spring Boot 3.5.14"
    ]);
  });

  it("requires the full Spring Boot x runtime matrix when both dimensions are claimed", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Spring Boot 3.4 and Spring Boot 3.5 with Node 22 and Node 24",
      [
        check("Tests / Spring Boot 3.4.13 / Node 22", "success"),
        check("Tests / Spring Boot 3.4.13 / Node 24", "success"),
        check("Tests / Spring Boot 3.5.14 / Node 22", "success")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("spring-boot 3.5");
    expect(assessment.reason).toContain("node 24");
  });
});
