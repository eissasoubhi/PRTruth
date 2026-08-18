import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyPullRequest } from "../src/verify.js";

function fixture(name: string): unknown {
  const url = new URL(`./fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("fixture-driven verification", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps functional requirements unproven while proving matching CI requirements", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/repos/acme/shop/issues/42")) return jsonResponse(fixture("issue"));
      if (url.endsWith("/repos/acme/shop/pulls/77")) return jsonResponse(fixture("pull"));
      if (url.includes("/repos/acme/shop/pulls/77/files")) return jsonResponse(fixture("files"));
      if (url.includes("/repos/acme/shop/commits/abc123/check-runs")) return jsonResponse(fixture("checks"));
      if (url.includes("/repos/acme/shop/actions/runs?head_sha=")) return new Response("not found", { status: 404 });
      if (url.includes("/repos/acme/shop/contents/")) return new Response("not found", { status: 404 });

      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const report = await verifyPullRequest({
      repository: "acme/shop",
      issueNumber: 42,
      prNumber: 77,
      token: "fixture-token"
    });

    expect(report.verdict).toBe("NOT_PROVEN");
    expect(report.changedFiles).toEqual(["src/export/csv.ts"]);
    expect(report.instructions).toEqual([]);
    expect(report.results).toHaveLength(2);
    expect(report.results[0]).toMatchObject({
      status: "UNPROVEN",
      evidence: [{ kind: "diff", summary: "Changed file: src/export/csv.ts" }]
    });
    expect(report.results[1]).toMatchObject({
      status: "PROVEN",
      evidence: [{ kind: "ci", summary: "test: success" }]
    });
  });

  it("uses GitHub Actions steps for validation claims without treating test-coverage requirements as proven", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/repos/acme/factory/issues/1")) {
        return jsonResponse({
          number: 1,
          title: "Authentication and workspaces",
          body: "## Acceptance criteria\n- Automated tests for core identity/workspace flows\n- Tests pass",
          html_url: "https://github.com/acme/factory/issues/1"
        });
      }
      if (url.endsWith("/repos/acme/factory/pulls/3")) {
        return jsonResponse({
          number: 3,
          title: "Authentication and workspace onboarding",
          body: "## Validation\n\nCI passes install, lint, typecheck, tests and production build.",
          html_url: "https://github.com/acme/factory/pull/3",
          head: { sha: "head123" }
        });
      }
      if (url.includes("/repos/acme/factory/pulls/3/files")) {
        return jsonResponse([
          { filename: "apps/web/lib/auth.ts", status: "modified" },
          { filename: "test/auth.test.ts", status: "added" }
        ]);
      }
      if (url.includes("/repos/acme/factory/commits/head123/check-runs")) {
        return jsonResponse({
          check_runs: [
            { name: "quality", status: "completed", conclusion: "success" }
          ]
        });
      }
      if (url.includes("/repos/acme/factory/actions/runs?head_sha=head123")) {
        return jsonResponse({ workflow_runs: [{ id: 9, workflow_id: 1 }] });
      }
      if (url.includes("/repos/acme/factory/actions/runs/9/jobs")) {
        return jsonResponse({
          jobs: [
            {
              name: "quality",
              html_url: "https://github.com/acme/factory/actions/runs/9/job/1",
              steps: [
                { name: "Run pnpm install --frozen-lockfile", status: "completed", conclusion: "success" },
                { name: "Run pnpm lint", status: "completed", conclusion: "success" },
                { name: "Run pnpm typecheck", status: "completed", conclusion: "success" },
                { name: "Run pnpm test", status: "completed", conclusion: "success" },
                { name: "Run pnpm build", status: "completed", conclusion: "success" }
              ]
            }
          ]
        });
      }
      if (url.includes("/repos/acme/factory/contents/")) return new Response("not found", { status: 404 });

      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const report = await verifyPullRequest({
      repository: "acme/factory",
      issueNumber: 1,
      prNumber: 3,
      token: "fixture-token"
    });

    expect(report.results[0]?.status).toBe("UNPROVEN");
    expect(report.results[1]?.status).toBe("PROVEN");
    expect(report.claimResults?.[0]).toMatchObject({
      status: "PROVEN"
    });
    expect(report.claimResults?.[0]?.evidence).toHaveLength(5);
  });
});
