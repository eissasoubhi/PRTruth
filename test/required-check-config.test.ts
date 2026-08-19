import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyPullRequest } from "../src/verify.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function installFixture(options: { observedAppId: number; requiredAppId: number }): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.endsWith("/repos/acme/service/issues/12")) {
      return jsonResponse({
        number: 12,
        title: "Required CI gate",
        body: "## Acceptance criteria\n- All required checks are green",
        html_url: "https://github.com/acme/service/issues/12"
      });
    }
    if (url.endsWith("/repos/acme/service/pulls/13")) {
      return jsonResponse({
        number: 13,
        title: "Harden CI gate",
        body: "Closes #12\n\n## Validation\n- [x] All required checks are green",
        html_url: "https://github.com/acme/service/pull/13",
        head: { sha: "required123" },
        base: { ref: "main" }
      });
    }
    if (url.includes("/repos/acme/service/pulls/13/files")) return jsonResponse([]);
    if (url.includes("/repos/acme/service/commits/required123/check-runs")) {
      return jsonResponse({
        check_runs: [
          {
            name: "required-ci",
            status: "completed",
            conclusion: "success",
            app: { id: options.observedAppId }
          },
          {
            name: "required-ci",
            status: "completed",
            conclusion: "failure",
            app: { id: 9999 }
          },
          { name: "advisory-gpu", status: "completed", conclusion: "failure", app: { id: 9999 } }
        ]
      });
    }
    if (url.includes("/repos/acme/service/actions/runs?head_sha=required123")) {
      return new Response("not found", { status: 404 });
    }
    if (url.endsWith("/repos/acme/service/branches/main")) {
      return jsonResponse({
        protection: {
          required_status_checks: {
            contexts: ["required-ci"],
            checks: [{ context: "required-ci", app_id: options.requiredAppId }]
          }
        }
      });
    }
    if (url.includes("/repos/acme/service/rules/branches/main?")) return jsonResponse([]);
    if (url.includes("/repos/acme/service/contents/")) {
      return new Response("not found", { status: 404 });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  });
}

describe("configured required-check verification", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("proves issue and PR required-check statements only from the configured GitHub App", async () => {
    installFixture({ observedAppId: 4242, requiredAppId: 4242 });

    const report = await verifyPullRequest({
      repository: "acme/service",
      issueNumber: 12,
      prNumber: 13,
      token: "fixture-token"
    });

    expect(report.verdict).toBe("PROVEN");
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({ status: "PROVEN" });
    expect(report.results[0]?.evidence.map((item) => item.summary)).toEqual([
      "required-ci: success"
    ]);
    expect(report.claimResults).toHaveLength(1);
    expect(report.claimResults?.[0]).toMatchObject({ status: "PROVEN" });
    expect(report.claimResults?.[0]?.evidence.map((item) => item.summary)).toEqual([
      "required-ci: success"
    ]);
    expect(report.checks).toContainEqual(expect.objectContaining({
      name: "required-ci",
      conclusion: "success",
      appId: 4242
    }));
  });

  it("keeps required-check statements unproven when the matching name comes from the wrong app", async () => {
    installFixture({ observedAppId: 1111, requiredAppId: 4242 });

    const report = await verifyPullRequest({
      repository: "acme/service",
      issueNumber: 12,
      prNumber: 13,
      token: "fixture-token"
    });

    expect(report.verdict).toBe("NOT_PROVEN");
    expect(report.results[0]).toMatchObject({ status: "UNPROVEN" });
    expect(report.results[0]?.reason).toContain("GitHub App 4242");
    expect(report.claimResults?.[0]).toMatchObject({ status: "UNPROVEN" });
    expect(report.claimResults?.[0]?.reason).toContain("GitHub App 4242");
  });
});