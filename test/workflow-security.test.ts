import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("read-only workflow checkout hardening", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/action-smoke.yml"
  ]) {
    it(`${path} does not persist checkout credentials`, () => {
      const content = workflow(path);

      expect(content).toContain("uses: actions/checkout@v4");
      expect(content).toContain("persist-credentials: false");
      expect(content).toContain("permissions:\n  contents: read");
    });
  }
});
