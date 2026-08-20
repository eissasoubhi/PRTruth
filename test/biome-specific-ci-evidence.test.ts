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

describe("Biome-specific CI evidence", () => {
  it("does not let aggregate green CI prove an explicit Biome claim", () => {
    const assessment = assessGenericCiSuccess("Biome checks passed", [
      check("Checks", "success"),
      check("Build", "success"),
      check("Checks / Check formatting and lint rules", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "UNPROVEN" });
    expect(assessment?.reason).toContain("biome");
    expect(assessment?.matchedChecks).toEqual([]);
  });

  it("proves a Biome claim from explicitly named workflow evidence", () => {
    const assessment = assessGenericCiSuccess("Biome checks passed", [
      check("Checks", "success"),
      check("Checks / Run pnpm exec biome check .", "success", "step")
    ]);

    expect(assessment).toMatchObject({ status: "PROVEN" });
    expect(assessment?.matchedChecks.map((item) => item.name)).toEqual([
      "Checks / Run pnpm exec biome check ."
    ]);
  });

  it("fails a Biome claim when matching Biome evidence fails", () => {
    const assessment = assessGenericCiSuccess("Biome checks passed", [
      check("Checks", "success"),
      check("Checks / Biome", "failure", "step")
    ]);

    expect(assessment).toMatchObject({ status: "FAILED" });
    expect(assessment?.reason).toContain("Checks / Biome");
  });
});
