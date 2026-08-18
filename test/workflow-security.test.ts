import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("workflow checkout hardening", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/action-smoke.yml",
    ".github/workflows/release.yml",
    ".github/workflows/npm-publish.yml"
  ]) {
    it(`${path} does not persist checkout credentials`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/checkout@v4");
      expect(content).toContain("persist-credentials: false");
    });
  }

  it("keeps read-only workflows on contents: read", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      ".github/workflows/action-smoke.yml",
      ".github/workflows/npm-publish.yml"
    ]) {
      expect(workflow(path)).toContain("permissions:\n  contents: read");
    }
  });

  it("keeps release writes explicit through workflow permissions", () => {
    expect(workflow(".github/workflows/release.yml")).toContain("permissions:\n  contents: write");
  });
});
