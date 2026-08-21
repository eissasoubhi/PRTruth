import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function publicDoc(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("public launch documentation", () => {
  const paths = [
    "README.md",
    "docs/demo.md",
    "docs/assets/prtruth-demo.svg"
  ];

  it.each(paths)("%s does not depend on an internal project demo", (path) => {
    expect(publicDoc(path)).not.toContain("ai-saas-factory");
  });

  it("keeps the primary CLI example reusable for any repository", () => {
    expect(publicDoc("README.md")).toContain("--repo owner/repository");
    expect(publicDoc("docs/demo.md")).toContain("--repo owner/repository");
    expect(publicDoc("docs/assets/prtruth-demo.svg")).toContain("--repo owner/repository");
  });
});
