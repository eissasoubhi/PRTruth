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

describe("Swift validation-specific CI evidence", () => {
  it("does not let aggregate green CI prove explicit SwiftLint and SwiftFormat claims", () => {
    const assessment = assessGenericCiSuccess("SwiftLint and SwiftFormat are clean", [
      check("CI", "success"),
      check("Build all schemes", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("swiftlint");
    expect(assessment?.reason).toContain("swiftformat");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves both tools only when both named checks succeed", () => {
    const assessment = assessGenericCiSuccess("SwiftFormat --lint and SwiftLint --strict both clean", [
      check("SwiftFormat", "success"),
      check("SwiftLint", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "SwiftLint",
      "SwiftFormat"
    ]);
  });

  it("keeps a composite claim unproven when one named tool is missing", () => {
    const assessment = assessGenericCiSuccess("SwiftFormat and SwiftLint are clean", [
      check("SwiftLint", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("swiftformat");
  });

  it("fails a composite claim when explicit SwiftLint evidence fails", () => {
    const assessment = assessGenericCiSuccess("SwiftFormat and SwiftLint are clean", [
      check("SwiftFormat", "success"),
      check("SwiftLint", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("SwiftLint");
  });
});
