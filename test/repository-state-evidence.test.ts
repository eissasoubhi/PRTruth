import { describe, expect, it } from "vitest";
import {
  assessExactHeadPathState,
  extractExplicitPathStateIntent
} from "../src/repository-state-evidence.js";
import type { Requirement } from "../src/types.js";

const removalRequirement: Requirement = {
  id: "REQ-1",
  text: "Remove `.github/workflows/docs.yml`.",
  source: "acceptance-section"
};

const presenceRequirement: Requirement = {
  id: "REQ-2",
  text: "`cooking-tips/README.md` exists.",
  source: "acceptance-section"
};

describe("explicit exact-head repository path-state evidence", () => {
  it("extracts one explicit repository path from a single-clause removal requirement", () => {
    expect(extractExplicitPathStateIntent(removalRequirement.text)).toEqual({
      path: ".github/workflows/docs.yml",
      expected: "absent"
    });
  });

  it("extracts one explicit repository path from a single-clause existence requirement", () => {
    expect(extractExplicitPathStateIntent(presenceRequirement.text)).toEqual({
      path: "cooking-tips/README.md",
      expected: "present"
    });
    expect(extractExplicitPathStateIntent("`docs/guide.md` is present.")).toEqual({
      path: "docs/guide.md",
      expected: "present"
    });
  });

  it("fails closed on vague, unsafe, multi-path, and composite requirements", () => {
    expect(extractExplicitPathStateIntent("Remove the old workflow.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `../secret.txt`.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `a.yml` and `b.yml`.")).toBeNull();
    expect(extractExplicitPathStateIntent("Remove `a.yml` and update the README.")).toBeNull();
    expect(extractExplicitPathStateIntent("`a.yml` is absent or disabled.")).toBeNull();
    expect(extractExplicitPathStateIntent("Keep `a.yml` unchanged.")).toBeNull();
    expect(extractExplicitPathStateIntent("`docs/guide.md` exists and accurately describes the crate.")).toBeNull();
    expect(extractExplicitPathStateIntent("`docs/guide.md` exists, with setup instructions.")).toBeNull();
    expect(extractExplicitPathStateIntent("Create `docs/guide.md`.")).toBeNull();
  });

  it("proves only the explicit single-clause absence at the exact head", () => {
    const intent = extractExplicitPathStateIntent(removalRequirement.text)!;
    const result = assessExactHeadPathState(removalRequirement, intent, {
      state: "absent",
      path: ".github/workflows/docs.yml"
    });

    expect(result?.status).toBe("PROVEN");
    expect(result?.evidence[0]?.summary).toContain("does not contain .github/workflows/docs.yml");
  });

  it("fails an explicit single-clause removal when the path still exists", () => {
    const intent = extractExplicitPathStateIntent(removalRequirement.text)!;
    const result = assessExactHeadPathState(removalRequirement, intent, {
      state: "present",
      path: ".github/workflows/docs.yml",
      kind: "file",
      sha: "blob-sha",
      htmlUrl: "https://github.com/example/repo/blob/head/.github/workflows/docs.yml"
    });

    expect(result?.status).toBe("FAILED");
    expect(result?.evidence[0]?.url).toContain("docs.yml");
  });

  it("proves an explicit single-clause existence requirement when the path exists", () => {
    const intent = extractExplicitPathStateIntent(presenceRequirement.text)!;
    const result = assessExactHeadPathState(presenceRequirement, intent, {
      state: "present",
      path: "cooking-tips/README.md",
      kind: "file",
      sha: "blob-sha",
      htmlUrl: "https://github.com/example/repo/blob/head/cooking-tips/README.md"
    });

    expect(result?.status).toBe("PROVEN");
    expect(result?.evidence[0]?.summary).toContain("contains cooking-tips/README.md");
  });

  it("fails an explicit single-clause existence requirement when the path is absent", () => {
    const intent = extractExplicitPathStateIntent(presenceRequirement.text)!;
    const result = assessExactHeadPathState(presenceRequirement, intent, {
      state: "absent",
      path: "cooking-tips/README.md"
    });

    expect(result?.status).toBe("FAILED");
    expect(result?.reason).toContain("must exist");
  });

  it("does not assess a state returned for a different path", () => {
    const intent = extractExplicitPathStateIntent(removalRequirement.text)!;
    expect(assessExactHeadPathState(removalRequirement, intent, {
      state: "absent",
      path: ".github/workflows/other.yml"
    })).toBeNull();
  });
});
