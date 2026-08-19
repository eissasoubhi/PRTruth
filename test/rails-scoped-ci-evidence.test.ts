import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null = "success"): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("Rails-scoped generic CI evidence", () => {
  it("keeps a Rails matrix claim unproven when one claimed version is missing", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Rails 7.2.3.2, Rails 8.0.5.1 and Rails 8.1.3.1",
      [
        check("Ruby 3.4.10 / Rails 7.2.3.2 / MySQL 8.0"),
        check("Ruby 3.4.10 / Rails 8.1.3.1 / MySQL 8.0")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rails 8.0.5.1");
  });

  it("proves a Rails matrix claim when every named version is visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Rails 7.2.3.2, Rails 8.0.5.1 and Rails 8.1.3.1",
      [
        check("Ruby 3.4.10 / Rails 7.2.3.2 / MySQL 8.0"),
        check("Ruby 3.4.10 / Rails 8.0.5.1 / MySQL 8.0"),
        check("Ruby 3.4.10 / Rails 8.1.3.1 / MySQL 8.0")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("composes Rails versions with database versions", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Rails 7.2.3.2 and Rails 8.1.3.1 across MySQL 8.0 and MySQL 8.4",
      [
        check("Ruby 3.4.10 / Rails 7.2.3.2 / MySQL 8.0"),
        check("Ruby 3.4.10 / Rails 7.2.3.2 / MySQL 8.4"),
        check("Ruby 3.4.10 / Rails 8.1.3.1 / MySQL 8.0")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rails 8.1.3.1 + mysql 8.4");
  });

  it("accepts Active Record wording when the job exposes the same framework version", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Active Record 8.1.3.1",
      [check("Ruby 3.4.10 / Rails 8.1.3.1 / MySQL 8.0")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
