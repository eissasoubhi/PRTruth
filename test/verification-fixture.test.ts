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
});
