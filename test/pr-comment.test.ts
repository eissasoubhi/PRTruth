import { afterEach, describe, expect, it, vi } from "vitest";
import { PRTRUTH_COMMENT_MARKER, upsertPullRequestComment } from "../src/pr-comment.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("upsertPullRequestComment", () => {
  it("creates the evidence comment when no marker exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 42,
            body: `${PRTRUTH_COMMENT_MARKER}\n## PRTruth — PROVEN`,
            html_url: "https://github.com/acme/widgets/pull/12#issuecomment-42"
          },
          201
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPullRequestComment({
      repository: "acme/widgets",
      prNumber: 12,
      body: "## PRTruth — PROVEN",
      token: "test-token"
    });

    expect(result).toEqual({
      action: "created",
      commentId: 42,
      htmlUrl: "https://github.com/acme/widgets/pull/12#issuecomment-42"
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/repos/acme/widgets/issues/12/comments?per_page=100&page=1"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });

    const createBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as { body: string };
    expect(createBody.body).toBe(`${PRTRUTH_COMMENT_MARKER}\n## PRTruth — PROVEN`);
  });

  it("updates the existing marked comment instead of creating a duplicate", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([{ id: 7, body: `${PRTRUTH_COMMENT_MARKER}\nold report` }])
      )
      .mockResolvedValueOnce(jsonResponse({ id: 7, body: `${PRTRUTH_COMMENT_MARKER}\nnew report` }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPullRequestComment({
      repository: "acme/widgets",
      prNumber: 12,
      body: "new report",
      token: "test-token"
    });

    expect(result.action).toBe("updated");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/repos/acme/widgets/issues/comments/7");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
  });

  it("finds an existing PRTruth comment beyond the first 100 comments", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      body: `unrelated comment ${index + 1}`
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse([{ id: 101, body: `${PRTRUTH_COMMENT_MARKER}\nold report` }]))
      .mockResolvedValueOnce(jsonResponse({ id: 101, body: `${PRTRUTH_COMMENT_MARKER}\nnew report` }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPullRequestComment({
      repository: "acme/widgets",
      prNumber: 12,
      body: "new report",
      token: "test-token"
    });

    expect(result.action).toBe("updated");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("page=2");
  });

  it("requires a token before attempting to publish", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertPullRequestComment({
        repository: "acme/widgets",
        prNumber: 12,
        body: "report",
        token: ""
      })
    ).rejects.toThrow("GITHUB_TOKEN is required");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
