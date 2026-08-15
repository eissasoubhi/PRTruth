import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeGitHubStepSummary } from "../src/github-summary.js";

describe("writeGitHubStepSummary", () => {
  it("returns false when no summary path is available", async () => {
    expect(await writeGitHubStepSummary("hello", "")).toBe(false);
  });

  it("appends Markdown with a trailing newline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prtruth-summary-"));
    const path = join(directory, "summary.md");
    expect(await writeGitHubStepSummary("## PRTruth\nproof", path)).toBe(true);
    expect(await writeGitHubStepSummary("second", path)).toBe(true);
    expect(await readFile(path, "utf8")).toBe("## PRTruth\nproof\nsecond\n");
  });
});
