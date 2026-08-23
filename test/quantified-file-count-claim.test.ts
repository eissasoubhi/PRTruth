import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function success(name: string): CheckRunSummary {
  return { name, status: "completed", conclusion: "success" };
}

describe("quantified file-count completion claims", () => {
  it("does not prove an artifact count from an unrelated successful build", () => {
    const assessment = assessCompletionClaim(
      "Probe publish at a non-SNAPSHOT version writes 165 files into build/staging: 150 artifacts plus 15 metadata files",
      [success("build (ubuntu-latest)"), success("build (macos-latest)")]
    );

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("stated value");
  });

  it("still proves an ordinary build-success claim from matching green build evidence", () => {
    const assessment = assessCompletionClaim(
      "The build passes",
      [success("build (ubuntu-latest)")]
    );

    expect(assessment.status).toBe("PROVEN");
  });
});
