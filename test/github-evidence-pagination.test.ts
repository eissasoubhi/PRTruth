import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "../src/github.js";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("GitHub evidence pagination", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects check runs beyond the first 100 results", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/check-runs?") && url.includes("&page=1")) {
        return jsonResponse({
          check_runs: Array.from({ length: 100 }, (_, index) => ({
            name: `check-${index + 1}`,
            status: "completed",
            conclusion: "success"
          }))
        });
      }

      if (url.includes("/check-runs?") && url.includes("&page=2")) {
        return jsonResponse({
          check_runs: [
            {
              name: "late-failing-check",
              status: "completed",
              conclusion: "failure"
            }
          ]
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const client = new GitHubClient("token");
    const checks = await client.getCheckRuns("acme/shop", "abc123");

    expect(checks).toHaveLength(101);
    expect(checks.at(-1)).toMatchObject({
      name: "late-failing-check",
      conclusion: "failure"
    });
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("&page=2"))).toBe(true);
  });

  it("paginates workflow runs before choosing the latest run per workflow", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/actions/runs?head_sha=") && url.includes("&page=1")) {
        return jsonResponse({
          workflow_runs: Array.from({ length: 100 }, (_, index) => ({
            id: index + 1,
            workflow_id: 7
          }))
        });
      }

      if (url.includes("/actions/runs?head_sha=") && url.includes("&page=2")) {
        return jsonResponse({ workflow_runs: [{ id: 101, workflow_id: 7 }] });
      }

      if (url.includes("/actions/runs/101/jobs?") && url.includes("&page=1")) {
        return jsonResponse({ jobs: [] });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const client = new GitHubClient("token");
    await client.getWorkflowStepChecks("acme/shop", "head-sha");

    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).includes("/actions/runs/101/jobs?")
    )).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).includes("/actions/runs/100/jobs?")
    )).toBe(false);
  });

  it("collects workflow jobs beyond the first 100 results", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/actions/runs?head_sha=") && url.includes("&page=1")) {
        return jsonResponse({ workflow_runs: [{ id: 501, workflow_id: 9 }] });
      }

      if (url.includes("/actions/runs/501/jobs?") && url.includes("&page=1")) {
        return jsonResponse({
          jobs: Array.from({ length: 100 }, (_, index) => ({
            name: `job-${index + 1}`,
            steps: [
              { name: "Run", status: "completed", conclusion: "success" }
            ]
          }))
        });
      }

      if (url.includes("/actions/runs/501/jobs?") && url.includes("&page=2")) {
        return jsonResponse({
          jobs: [
            {
              name: "job-101",
              steps: [
                { name: "Late step", status: "completed", conclusion: "failure" }
              ]
            }
          ]
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const client = new GitHubClient("token");
    const checks = await client.getWorkflowStepChecks("acme/shop", "head-sha");

    expect(checks).toHaveLength(101);
    expect(checks.at(-1)).toMatchObject({
      name: "job-101 / Late step",
      conclusion: "failure"
    });
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).includes("/actions/runs/501/jobs?per_page=100&page=2")
    )).toBe(true);
  });

  it("includes structured workflow runner labels in each step evidence name", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/actions/runs?head_sha=") && url.includes("&page=1")) {
        return jsonResponse({ workflow_runs: [{ id: 601, workflow_id: 12 }] });
      }

      if (url.includes("/actions/runs/601/jobs?") && url.includes("&page=1")) {
        return jsonResponse({
          jobs: [
            {
              name: "quality",
              labels: ["self-hosted", "Linux", "ARM64", "self-hosted"],
              html_url: "https://github.com/acme/shop/actions/runs/601/job/1",
              steps: [
                { name: "Run pnpm install", status: "completed", conclusion: "success" },
                { name: "Run pnpm test", status: "completed", conclusion: "success" }
              ]
            }
          ]
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const client = new GitHubClient("token");
    const checks = await client.getWorkflowStepChecks("acme/shop", "head-sha");

    expect(checks.map((check) => check.name)).toEqual([
      "quality [self-hosted, Linux, ARM64] / Run pnpm install",
      "quality [self-hosted, Linux, ARM64] / Run pnpm test"
    ]);
    expect(checks.every((check) => check.html_url?.includes("/actions/runs/601/job/1"))).toBe(true);
  });
});