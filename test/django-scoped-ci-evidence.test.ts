import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null = "success"): CheckRunSummary {
  return { name, conclusion, status: "completed", scope: "check" };
}

describe("Django-scoped generic CI evidence", () => {
  it("keeps a Django matrix claim unproven when one claimed version is missing", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Django 5.2, Django 6.0 and Django 6.1",
      [
        check("Django compatibility ==5.2.* / Python 3.12"),
        check("Django compatibility ==6.1.* / Python 3.12")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("django 6.0");
  });

  it("proves a Django matrix claim when every named version is visible", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Django 4.2, Django 5.2, Django 6.0 and Django 6.1",
      [
        check("Django compatibility ==4.2.* / Python 3.12"),
        check("Django compatibility ==5.2.* / Python 3.12"),
        check("Django compatibility ==6.0.* / Python 3.12"),
        check("Django compatibility ==6.1.* / Python 3.12")
      ]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("composes Django versions with Python versions", () => {
    const assessment = assessGenericCiSuccess(
      "CI is green on Django 5.2 and Django 6.1 across Python 3.12 and Python 3.13",
      [
        check("Django compatibility ==5.2.* / Python 3.12"),
        check("Django compatibility ==5.2.* / Python 3.13"),
        check("Django compatibility ==6.1.* / Python 3.12")
      ]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("django 6.1");
    expect(assessment?.reason).toContain("python 3.13");
  });

  it("accepts the real django-tenants compatibility job naming convention", () => {
    const assessment = assessGenericCiSuccess(
      "Workflow passes on Django 6.1",
      [check("Django compatibility ==6.1.* / Python 3.13")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });
});
