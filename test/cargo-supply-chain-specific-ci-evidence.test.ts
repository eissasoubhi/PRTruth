import { describe, expect, it } from "vitest";
import { assessGenericCiSuccess } from "../src/ci-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(
  name: string,
  conclusion: string | null,
  scope: "check" | "step" = "step",
  status = "completed"
): CheckRunSummary {
  return { name, conclusion, status, scope };
}

describe("Cargo supply-chain tool evidence", () => {
  it("does not let generic green CI prove cargo-machete", () => {
    const assessment = assessGenericCiSuccess("cargo machete — clean", [
      check("Rust / Lint", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("cargo-machete");
  });

  it("proves cargo-machete from the executable Calimero-style step", () => {
    const assessment = assessGenericCiSuccess("cargo machete — clean", [
      check("Rust / Cargo machete (unused dependencies)", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Rust / Cargo machete (unused dependencies)"
    ]);
  });

  it("proves cargo-deny from explicitly named evidence", () => {
    const assessment = assessGenericCiSuccess(
      "cargo deny check advisories bans licenses sources passed",
      [check("Rust / Cargo deny", "success")]
    );

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("requires both tools for a composite cargo-deny and cargo-machete claim", () => {
    const missingMachete = assessGenericCiSuccess(
      "cargo deny and cargo machete passed",
      [check("Rust / Cargo deny", "success")]
    );
    const complete = assessGenericCiSuccess(
      "cargo deny and cargo machete passed",
      [
        check("Rust / Cargo deny", "success"),
        check("Rust / Cargo machete (unused dependencies)", "success")
      ]
    );

    expect(missingMachete).toMatchObject({ status: "UNPROVEN" });
    expect(missingMachete?.reason).toContain("cargo-machete");
    expect(complete).toMatchObject({ status: "PROVEN" });
  });

  it("fails when explicitly named cargo-deny evidence fails", () => {
    const assessment = assessGenericCiSuccess("cargo-deny checks passed", [
      check("Rust / Cargo deny", "failure")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Cargo deny");
  });
});
