import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string; keywords?: string[] };
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const actionGuide = readFileSync(
  new URL("../docs/github-actions.md", import.meta.url),
  "utf8"
);

describe("release metadata", () => {
  it("keeps the AI discovery keyword", () => {
    expect(packageJson.keywords).toContain("ai");
  });

  it("points GitHub Action quickstarts at the package release version", () => {
    const actionRef = `eissasoubhi/PRTruth@v${packageJson.version}`;

    expect(readme).toContain(actionRef);
    expect(actionGuide).toContain(actionRef);
  });
});
