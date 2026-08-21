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

describe("RustSec and cargo-audit evidence", () => {
  it("does not let unrelated green CI prove a RustSec claim", () => {
    const assessment = assessGenericCiSuccess("RustSec security scan passed", [
      check("Rust / Tests", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("rustsec/cargo-audit");
  });

  it("proves the real cartel1508-style RustSec claim from cargo-audit evidence", () => {
    const assessment = assessGenericCiSuccess("RustSec security scan passed", [
      check("cargo-audit", "success", "check"),
      check("cargo-audit / Scan final core production Cargo.lock against RustSec", "success")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "cargo-audit / Scan final core production Cargo.lock against RustSec"
    ]);
  });

  it("proves cargo audit from explicitly named evidence", () => {
    const assessment = assessGenericCiSuccess("cargo audit passed", [
      check("Security / cargo-audit", "success", "check")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
  });

  it("fails when matching RustSec or cargo-audit evidence fails", () => {
    const assessment = assessGenericCiSuccess("RustSec security scan passed", [
      check("Security / cargo-audit", "failure", "check")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("cargo-audit");
  });

  it("does not use cargo-deny as cargo-audit evidence", () => {
    const assessment = assessGenericCiSuccess("cargo audit passed", [
      check("Rust / Cargo deny", "success")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
  });
});
