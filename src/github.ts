import { collectPages } from "./pagination.js";
import type { RequiredStatusCheck } from "./types.js";

interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
}

interface GitHubIssueCommentResponse {
  id: number;
  body: string | null;
  author_association: string;
  html_url?: string;
}

interface GitHubPullResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  head: { sha: string };
  base: { ref: string };
}

interface GitHubPullFileResponse {
  filename: string;
  status: string;
  patch?: string;
}

interface GitHubCheckRunResponse {
  name: string;
  status: string;
  conclusion: string | null;
  html_url?: string;
  app?: {
    id: number;
  } | null;
}

interface GitHubCheckRunsResponse {
  check_runs: GitHubCheckRunResponse[];
}

interface GitHubWorkflowRunResponse {
  id: number;
  workflow_id: number;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRunResponse[];
}

interface GitHubWorkflowJobStepResponse {
  name: string;
  status: string;
  conclusion: string | null;
}

interface GitHubWorkflowJobResponse {
  name: string;
  html_url?: string;
  labels?: string[];
  steps?: GitHubWorkflowJobStepResponse[] | null;
}

interface GitHubWorkflowJobsResponse {
  jobs: GitHubWorkflowJobResponse[];
}

interface GitHubBranchResponse {
  protection?: {
    required_status_checks?: {
      contexts?: string[];
      checks?: Array<{
        context: string;
        app_id?: number | null;
      }>;
    };
  };
}

interface GitHubRequiredStatusCheckRuleResponse {
  type: string;
  parameters?: {
    required_status_checks?: Array<{
      context: string;
      integration_id?: number | null;
    }>;
  };
}

export interface GitHubContentResponse {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  html_url?: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

function errorMessage(status: number, path: string, retryAfterSeconds?: number): string {
  if (status === 401) {
    return "GitHub authentication failed. Check GITHUB_TOKEN and its permissions.";
  }

  if (status === 403) {
    return retryAfterSeconds
      ? `GitHub API rate limit or abuse protection triggered. Retry in ${retryAfterSeconds}s.`
      : "GitHub API access was forbidden. Check token permissions or rate limits.";
  }

  if (status === 404) {
    return `GitHub resource not found: ${path}. Check the repository, issue/PR number, and token access.`;
  }

  return `GitHub API request failed with status ${status}: ${path}`;
}

function apiError(response: Response, path: string): GitHubApiError {
  const retryAfterHeader = response.headers.get("retry-after");
  const parsedRetryAfter = retryAfterHeader === null ? undefined : Number.parseInt(retryAfterHeader, 10);
  const retryAfterSeconds =
    parsedRetryAfter !== undefined && Number.isFinite(parsedRetryAfter)
      ? parsedRetryAfter
      : undefined;

  return new GitHubApiError(
    errorMessage(response.status, path, retryAfterSeconds),
    response.status,
    path,
    retryAfterSeconds
  );
}

function positiveSourceId(value: number | null | undefined): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}

function normalizeContext(context: string): string {
  return context.trim().toLowerCase();
}

function requiredCheckKey(check: RequiredStatusCheck): string {
  return `${normalizeContext(check.context)}\u0000${check.appId ?? "any"}`;
}

function dedupeRequiredChecks(checks: RequiredStatusCheck[]): RequiredStatusCheck[] {
  const seen = new Set<string>();
  return checks.filter((check) => {
    const key = requiredCheckKey(check);
    if (!check.context.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function workflowJobEvidenceName(job: GitHubWorkflowJobResponse): string {
  const labels = [...new Set((job.labels ?? []).map((label) => label.trim()).filter(Boolean))];
  return labels.length > 0 ? `${job.name} [${labels.join(", ")}]` : job.name;
}

export class GitHubClient {
  constructor(private readonly token = process.env.GITHUB_TOKEN) {}

  private headers(authenticated = true): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "PRTruth"
    };

    if (authenticated && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchResponse(path: string): Promise<{ response: Response; originalError?: GitHubApiError }> {
    const url = `https://api.github.com${path}`;
    const response = await fetch(url, { headers: this.headers() });

    // A shared Actions token can hit GitHub's secondary/rate limit while the
    // same public resource is still readable anonymously. Retrying once
    // without credentials is safe only when the anonymous read itself succeeds.
    // If it does not, preserve the original authenticated 403 so private or
    // permission-restricted resources never turn into a misleading 404/absence.
    if (response.status === 403 && this.token) {
      const originalError = apiError(response, path);
      const anonymous = await fetch(url, { headers: this.headers(false) });
      if (anonymous.ok) {
        return { response: anonymous, originalError };
      }
      return { response, originalError };
    }

    return { response };
  }

  private async request<T>(path: string): Promise<T> {
    const { response, originalError } = await this.fetchResponse(path);

    if (!response.ok) {
      throw originalError ?? apiError(response, path);
    }

    return response.json() as Promise<T>;
  }

  private async requestOptional<T>(path: string): Promise<T | null> {
    const { response, originalError } = await this.fetchResponse(path);
    if (response.status === 404 && !originalError) return null;

    if (!response.ok) {
      throw originalError ?? apiError(response, path);
    }

    return response.json() as Promise<T>;
  }

  async getIssue(repository: string, issueNumber: number): Promise<GitHubIssueResponse> {
    return this.request(`/repos/${repository}/issues/${issueNumber}`);
  }

  async getIssueComments(repository: string, issueNumber: number): Promise<GitHubIssueCommentResponse[]> {
    return collectPages((page, perPage) =>
      this.request<GitHubIssueCommentResponse[]>(
        `/repos/${repository}/issues/${issueNumber}/comments?per_page=${perPage}&page=${page}`
      )
    );
  }

  async getPull(repository: string, prNumber: number): Promise<GitHubPullResponse> {
    return this.request(`/repos/${repository}/pulls/${prNumber}`);
  }

  async getPullFiles(repository: string, prNumber: number): Promise<GitHubPullFileResponse[]> {
    return collectPages((page, perPage) =>
      this.request<GitHubPullFileResponse[]>(
        `/repos/${repository}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`
      )
    );
  }

  async getCheckRuns(repository: string, sha: string): Promise<GitHubCheckRunResponse[]> {
    return collectPages(async (page, perPage) => {
      const response = await this.request<GitHubCheckRunsResponse>(
        `/repos/${repository}/commits/${sha}/check-runs?per_page=${perPage}&page=${page}`
      );
      return response.check_runs;
    });
  }

  async getWorkflowStepChecks(repository: string, sha: string): Promise<GitHubCheckRunResponse[]> {
    try {
      const workflowRuns = await collectPages(async (page, perPage) => {
        const response = await this.request<GitHubWorkflowRunsResponse>(
          `/repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=${perPage}&page=${page}`
        );
        return response.workflow_runs;
      });

      const latestByWorkflow = new Map<number, GitHubWorkflowRunResponse>();
      for (const run of workflowRuns) {
        const current = latestByWorkflow.get(run.workflow_id);
        if (!current || run.id > current.id) {
          latestByWorkflow.set(run.workflow_id, run);
        }
      }

      const jobsByRun = await Promise.all(
        [...latestByWorkflow.values()].map((run) =>
          collectPages(async (page, perPage) => {
            const response = await this.request<GitHubWorkflowJobsResponse>(
              `/repos/${repository}/actions/runs/${run.id}/jobs?per_page=${perPage}&page=${page}`
            );
            return response.jobs;
          })
        )
      );

      return jobsByRun.flatMap((jobs) =>
        jobs.flatMap((job) => {
          const jobName = workflowJobEvidenceName(job);
          return (job.steps ?? []).map((step) => ({
            name: `${jobName} / ${step.name}`,
            status: step.status,
            conclusion: step.conclusion,
            ...(job.html_url ? { html_url: job.html_url } : {})
          }));
        })
      );
    } catch (error) {
      if (error instanceof GitHubApiError && (error.status === 403 || error.status === 404)) {
        return [];
      }
      throw error;
    }
  }

  async getRequiredStatusCheckContexts(repository: string, branch: string): Promise<RequiredStatusCheck[] | null> {
    try {
      const encodedBranch = encodeURIComponent(branch);
      const [branchInfo, rules] = await Promise.all([
        this.request<GitHubBranchResponse>(`/repos/${repository}/branches/${encodedBranch}`),
        collectPages((page, perPage) =>
          this.request<GitHubRequiredStatusCheckRuleResponse[]>(
            `/repos/${repository}/rules/branches/${encodedBranch}?per_page=${perPage}&page=${page}`
          )
        )
      ]);

      const requiredChecks: RequiredStatusCheck[] = [];
      const classicStatusChecks = branchInfo.protection?.required_status_checks;
      const classicChecks = classicStatusChecks?.checks ?? [];
      const sourceAwareContexts = new Set<string>();

      for (const check of classicChecks) {
        const context = check.context.trim();
        if (!context) continue;
        const appId = positiveSourceId(check.app_id);
        requiredChecks.push({ context, ...(appId !== undefined ? { appId } : {}) });
        sourceAwareContexts.add(normalizeContext(context));
      }

      // Preserve distinct legacy contexts, but do not add a generic duplicate
      // for a context already represented by source-aware `checks` metadata.
      for (const contextValue of classicStatusChecks?.contexts ?? []) {
        const context = contextValue.trim();
        if (context && !sourceAwareContexts.has(normalizeContext(context))) {
          requiredChecks.push({ context });
        }
      }

      for (const rule of rules) {
        if (rule.type !== "required_status_checks") continue;
        for (const check of rule.parameters?.required_status_checks ?? []) {
          const context = check.context.trim();
          if (!context) continue;
          const appId = positiveSourceId(check.integration_id);
          requiredChecks.push({ context, ...(appId !== undefined ? { appId } : {}) });
        }
      }

      return dedupeRequiredChecks(requiredChecks);
    } catch (error) {
      if (error instanceof GitHubApiError && (error.status === 403 || error.status === 404)) {
        return null;
      }
      throw error;
    }
  }

  async getContent(repository: string, path: string): Promise<GitHubContentResponse | null> {
    return this.requestOptional(`/repos/${repository}/contents/${path}`);
  }
}

export type {
  GitHubIssueResponse,
  GitHubIssueCommentResponse,
  GitHubPullResponse,
  GitHubPullFileResponse,
  GitHubCheckRunResponse
};
