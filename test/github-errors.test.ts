import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError, GitHubClient } from "../src/github.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

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

  it("combines classic branch protection and active ruleset required checks", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/shop/branches/main")) {
        return jsonResponse({
          protection: {
            required_status_checks: {
              contexts: ["classic-ci"],
              checks: [{ context: "classic-check-ci", app_id: null }]
            }
          }
        });
      }
      if (url.includes("/repos/acme/shop/rules/branches/main?")) {
        return jsonResponse([
          {
            type: "required_status_checks",
            parameters: {
              required_status_checks: [
                { context: "ruleset-ci", integration_id: null },
                { context: "classic-ci" }
              ]
            }
          },
          { type: "non_fast_forward" }
        ]);
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const client = new GitHubClient("token");
    await expect(client.getRequiredStatusCheckContexts("acme/shop", "main")).resolves.toEqual([
      { context: "classic-check-ci" },
      { context: "classic-ci" },
      { context: "ruleset-ci" }
    ]);
  });

  it("preserves a required context pinned to a specific app source", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/shop/branches/main")) {
        return jsonResponse({
          protection: {
            required_status_checks: {
              contexts: ["trusted-ci"],
              checks: [{ context: "trusted-ci", app_id: 1234 }]
            }
          }
        });
      }
      if (url.includes("/repos/acme/shop/rules/branches/main?")) return jsonResponse([]);
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const client = new GitHubClient("token");
    await expect(client.getRequiredStatusCheckContexts("acme/shop", "main")).resolves.toEqual([
      { context: "trusted-ci", appId: 1234 }
    ]);
  });

  it("preserves a required context pinned to a specific ruleset integration", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/shop/branches/main")) {
        return jsonResponse({ protection: { required_status_checks: { contexts: [] } } });
      }
      if (url.includes("/repos/acme/shop/rules/branches/main?")) {
        return jsonResponse([
          {
            type: "required_status_checks",
            parameters: {
              required_status_checks: [{ context: "trusted-ci", integration_id: 5678 }]
            }
          }
        ]);
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const client = new GitHubClient("token");
    await expect(client.getRequiredStatusCheckContexts("acme/shop", "main")).resolves.toEqual([
      { context: "trusted-ci", appId: 5678 }
    ]);
  });

  it("fails closed when active ruleset metadata is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/shop/branches/main")) {
        return jsonResponse({ protection: { required_status_checks: { contexts: ["classic-ci"] } } });
      }
      if (url.includes("/repos/acme/shop/rules/branches/main?")) {
        return new Response("forbidden", { status: 403 });
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const client = new GitHubClient("token");
    await expect(client.getRequiredStatusCheckContexts("acme/shop", "main")).resolves.toBeNull();
  });
});