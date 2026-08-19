import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("browser-scoped CI claim evidence", () => {
  it("does not prove a Firefox claim from a generic successful test job", () => {
    const assessment = assessCompletionClaim("Tests pass on Firefox", [
      check("unit tests", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("firefox");
  });

  it("proves a Firefox claim from a matching successful test job", () => {
    const assessment = assessCompletionClaim("Tests pass on Firefox", [
      check("browser tests / firefox", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks.map((item) => item.name)).toEqual([
      "browser tests / firefox"
    ]);
  });

  it("requires every explicitly claimed browser matrix entry", () => {
    const assessment = assessCompletionClaim("Tests pass on Chromium, Firefox and WebKit", [
      check("e2e tests / chromium", "success"),
      check("e2e tests / firefox", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("chromium, firefox, webkit");
  });

  it("proves a multi-browser claim across separate successful jobs", () => {
    const assessment = assessCompletionClaim("Tests pass on Chromium, Firefox and WebKit", [
      check("e2e tests / chromium", "success"),
      check("e2e tests / firefox", "success"),
      check("e2e tests / webkit", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
    expect(assessment.matchedChecks).toHaveLength(3);
  });

  it("keeps Chrome and Chromium distinct", () => {
    const assessment = assessCompletionClaim("Tests pass on Chrome", [
      check("e2e tests / chromium", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
  });

  it("requires the cross-product when database and browser matrices are both claimed", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on PostgreSQL and MySQL in Chromium and Firefox",
      [
        check("tests / postgres / chromium", "success"),
        check("tests / postgres / firefox", "success"),
        check("tests / mysql / chromium", "success")
      ]
    );

    expect(assessment.status).toBe("UNPROVEN");

    const complete = assessCompletionClaim(
      "Tests pass on PostgreSQL and MySQL in Chromium and Firefox",
      [
        check("tests / postgres / chromium", "success"),
        check("tests / postgres / firefox", "success"),
        check("tests / mysql / chromium", "success"),
        check("tests / mysql / firefox", "success")
      ]
    );

    expect(complete.status).toBe("PROVEN");
    expect(complete.matchedChecks).toHaveLength(4);
  });

  it("preserves non-browser environment scopes for every browser matrix job", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux ARM64 in Chromium and Firefox", [
      check("tests / linux / arm64 / chromium", "success"),
      check("tests / linux / x64 / firefox", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
  });
});
