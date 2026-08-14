import { describe, expect, it } from "vitest";
import { parseGitHubRepository } from "../src/repository.js";

describe("parseGitHubRepository", () => {
  it("parses HTTPS remotes", () => {
    expect(parseGitHubRepository("https://github.com/eissasoubhi/PRTruth.git")).toBe("eissasoubhi/PRTruth");
  });

  it("parses SSH remotes", () => {
    expect(parseGitHubRepository("git@github.com:eissasoubhi/PRTruth.git")).toBe("eissasoubhi/PRTruth");
  });
});
