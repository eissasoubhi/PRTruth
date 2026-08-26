import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError, GitHubClient } from "../src/github.js";

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub public-read fallback", () => {
  it("retries an authenticated 403 anonymously and accepts a successful public read", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(403, { message: "API rate limit exceeded" }))
      .mockResolvedValueOnce(response(200, {
        number: 12,
        title: "Public issue",
        body: null,
        html_url: "https://github.com/acme/widget/issues/12"
      }));
    vi.stubGlobal("fetch", fetchMock);

    const issue = await new GitHubClient("token").getIssue("acme/widget", 12);

    expect(issue.number).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer token");
    expect(fetchMock.mock.calls[1]?.[1]?.headers.Authorization).toBeUndefined();
  });

  it("preserves the authenticated 403 when the anonymous retry cannot read the resource", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(403, { message: "Resource not accessible" }))
      .mockResolvedValueOnce(response(404, { message: "Not Found" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GitHubClient("token").getIssue("acme/private", 12)).rejects.toMatchObject({
      status: 403
    } satisfies Partial<GitHubApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry anonymously when no token was supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(403, { message: "rate limited" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GitHubClient("").getIssue("acme/widget", 12)).rejects.toMatchObject({
      status: 403
    } satisfies Partial<GitHubApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not reinterpret authenticated 403 plus anonymous 404 as optional absence", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(403, { message: "Resource not accessible" }))
      .mockResolvedValueOnce(response(404, { message: "Not Found" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GitHubClient("token").getContent("acme/private", "secret.txt")).rejects.toMatchObject({
      status: 403
    } satisfies Partial<GitHubApiError>);
  });
});
