import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyPullRequest } from "../src/verify.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("trusted post-delivery maintainer comment evidence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces trusted PR-bound lifecycle evidence without promoting UNPROVEN to PROVEN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/repos/acme/service/pulls/65")) {
        return jsonResponse({
          number: 65,
          title: "Ship rollout behavior",
          body: "Closes #10",
          html_url: "https://github.com/acme/service/pull/65",
          head: { sha: "head65" }
        });
      }
      if (url.endsWith("/repos/acme/service/issues/10")) {
        return jsonResponse({
          number: 10,
          title: "Roll out and verify live behavior",
          body: "## Acceptance criteria\n- Tests green; merged; rolled out; next live occurrence quoted on the issue",
          html_url: "https://github.com/acme/service/issues/10"
        });
      }
      if (url.includes("/repos/acme/service/issues/10/comments")) {
        return jsonResponse([
          {
            id: 1,
            author_association: "OWNER",
            html_url: "https://github.com/acme/service/issues/10#issuecomment-1",
            body: "PR #65 merged and rolled out. Live since 03:40 UTC; observed and quoted the next skipped row."
          }
        ]);
      }
      if (url.includes("/repos/acme/service/pulls/65/files")) return jsonResponse([]);
      if (url.includes("/repos/acme/service/commits/head65/check-runs")) {
        return jsonResponse({ check_runs: [] });
      }
      if (url.includes("/repos/acme/service/actions/runs?head_sha=head65")) {
        return new Response("not found", { status: 404 });
      }
      if (url.includes("/repos/acme/service/contents/")) {
        return new Response("not found", { status: 404 });
      }

      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const report = await verifyPullRequest({
      repository: "acme/service",
      issueNumber: 10,
      prNumber: 65,
      token: "fixture-token"
    });

    expect(report.verdict).toBe("NOT_PROVEN");
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.status).toBe("UNPROVEN");
    expect(report.results[0]?.reason).toContain("supporting evidence only");
    expect(report.results[0]?.evidence).toEqual([
      expect.objectContaining({
        kind: "issue",
        url: "https://github.com/acme/service/issues/10#issuecomment-1"
      })
    ]);
  });
});
