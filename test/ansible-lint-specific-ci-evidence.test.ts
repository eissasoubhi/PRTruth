import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "check",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("ansible-lint CI evidence", () => {
  it("does not let unrelated green CI prove an explicit ansible-lint claim", () => {
    const assessment = assessGenericCiSuccess(
      "ansible-lint clean on the production profile",
      [check("CI", "success"), check("Tests", "success")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves ansible-lint only from matching executable evidence", () => {
    const assessment = assessGenericCiSuccess(
      "ansible-lint clean on the production profile",
      [check("Ansible playbooks / Run ansible-lint", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks).toHaveLength(1);
  });

  it("ignores ansible-lint setup/install-only evidence", () => {
    const assessment = assessGenericCiSuccess(
      "ansible-lint clean",
      [check("Install ansible and ansible-lint", "success", "step")]
    );

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("fails when explicit ansible-lint evidence fails", () => {
    const assessment = assessGenericCiSuccess(
      "ansible-lint clean",
      [check("Run ansible-lint", "failure", "step")]
    );

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("ansible-lint");
  });
});
