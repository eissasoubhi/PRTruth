import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError, GitHubClient } from "../src/github.js";

describe("GitHub API errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an actionable authentication error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad credentials", { status: 401 }));
    const client = new GitHubClient("bad-token");

    await expect(client.getIssue("acme/shop", 1)).rejects.toMatchObject({
      name: "GitHubApiError",
      status: 401,
      message: "GitHub authentication failed. Check GITHUB_TOKEN and its permissions."
    });
  });

  it("preserves rate-limit retry information", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 403, headers: { "retry-after": "60" } })
    );
    const client = new GitHubClient("token");

    try {
      await client.getPull("acme/shop", 2);
      throw new Error("Expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError);
      expect(error).toMatchObject({
        status: 403,
        retryAfterSeconds: 60,
        message: "GitHub API rate limit or abuse protection triggered. Retry in 60s."
      });
    }
  });

  it("includes the missing GitHub path for 404 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));
    const client = new GitHubClient("token");

    await expect(client.getIssue("acme/shop", 99)).rejects.toMatchObject({
      status: 404,
      path: "/repos/acme/shop/issues/99"
    });
  });

  it("keeps optional 404 content lookups non-fatal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));
    const client = new GitHubClient("token");

    await expect(client.getContent("acme/shop", "AGENTS.md")).resolves.toBeNull();
  });
});
