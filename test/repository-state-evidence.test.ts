import { describe, expect, it } from "vitest";
import {
  assessExactHeadPathState,
  extractExplicitPathStateIntent
} from "../src/repository-state-evidence.js";
import type { Requirement } from "../src/types.js";

const requirement: Requirement = {
  id: "REQ-1",
  text: "Remove `.github/workflows/docs.yml`.",
  source: "acceptance-section"
};

describe("explicit exact-head repository path-state evidence", () => {
  it("extracts one explicit repository path from a single-clause removal requirement", () => {
    expect(extractExplicitPathStateIntent(requirement.text)).toEqual({
      path: ".github/workflows/docs.yml",
      expected: "absent"
    });
  });

  it("fails closed on vague, unsafe, multi-path, and composite requirements", () => {
    expect(extractExplicitPathStateIntent("Remove the old workflow.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `../secret.txt`.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `a.yml` and `b.yml`.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `a.yml` and update the README.")).toBeNull();
    expect(extractExplicitPathStateIntent("`a.yml` is absent or disabled.")).toBeNull();
    expect(extractExplicitPathStateIntent("Keep `a.yml` unchanged.")).toBeNull();
  });

  it("proves only the explicit single-clause absence at the exact head", () => {
    const intent = extractExplicitPathStateIntent(requirement.text)!;
    const result = assessExactHeadPathState(requirement, intent, {
      state: "absent",
      path: ".github/workflows/docs.yml"
    });

    expect(result?.status).toBe("PROVEN");
    expect(result?.evidence[0]?.summary).toContain("does not contain .github/workflows/docs.yml");
  });

  it("fails an explicit single-clause removal when the path still exists", () => {
    const intent = extractExplicitPathStateIntent(requirement.text)!;
    const result = assessExactHeadPathState(requirement, intent, {
      state: "present",
      path: ".github/workflows/docs.yml",
      kind: "file",
      sha: "blob-sha",
      htmlUrl: "https://github.com/example/repo/blob/head/.github/workflows/docs.yml"
    });

    expect(result?.status).toBe("FAILED");
    expect(result?.evidence[0]?.url).toContain("docs.yml");
  });

  it("does not assess a state returned for a different path", () => {
    const intent = extractExplicitPathStateIntent(requirement.text)!;
    expect(assessExactHeadPathState(requirement, intent, {
      state: "absent",
      path: ".github/workflows/other.yml"
    })).toBeNull();
  });
});
