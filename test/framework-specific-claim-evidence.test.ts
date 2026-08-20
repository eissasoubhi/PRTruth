import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null = "success"): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("framework-scoped specific completion claims", () => {
  it("does not let generic green tests prove an explicit Django version", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Django 6.1",
      [check("unit tests")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("django 6.1");
  });

  it("proves a Django-specific test claim only from a matching visible lane", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Django 6.1",
      [check("Django compatibility ==6.1.* / pytest")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("does not let generic green tests prove an explicit Rails version", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Rails 8.1.3.1",
      [check("unit tests")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("rails 8.1.3.1");
  });

  it("proves a Rails-specific test claim only from a matching visible lane", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Active Record 8.1.3.1",
      [check("Ruby 3.4.10 / Rails 8.1.3.1 / tests")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("keeps a framework/runtime matrix claim unproven when a combination is missing", () => {
    const assessment = assessCompletionClaim(
      "Tests pass on Django 5.2 and Django 6.1 across Python 3.12 and Python 3.13",
      [
        check("Django compatibility ==5.2.* / Python 3.12 / pytest"),
        check("Django compatibility ==5.2.* / Python 3.13 / pytest"),
        check("Django compatibility ==6.1.* / Python 3.12 / pytest")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment.reason).toContain("django 6.1");
    expect(assessment.reason).toContain("python 3.13");
  });
});
