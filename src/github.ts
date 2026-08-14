interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
}

interface GitHubPullResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  head: { sha: string };
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
}

interface GitHubCheckRunsResponse {
  check_runs: GitHubCheckRunResponse[];
}

export interface GitHubContentResponse {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  html_url?: string;
}

export class GitHubClient {
  constructor(private readonly token = process.env.GITHUB_TOKEN) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "PRTruth"
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, { headers: this.headers() });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  private async requestOptional<T>(path: string): Promise<T | null> {
    const response = await fetch(`https://api.github.com${path}`, { headers: this.headers() });
    if (response.status === 404) return null;

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async getIssue(repository: string, issueNumber: number): Promise<GitHubIssueResponse> {
    return this.request(`/repos/${repository}/issues/${issueNumber}`);
  }

  async getPull(repository: string, prNumber: number): Promise<GitHubPullResponse> {
    return this.request(`/repos/${repository}/pulls/${prNumber}`);
  }

  async getPullFiles(repository: string, prNumber: number): Promise<GitHubPullFileResponse[]> {
    return this.request(`/repos/${repository}/pulls/${prNumber}/files?per_page=100`);
  }

  async getCheckRuns(repository: string, sha: string): Promise<GitHubCheckRunResponse[]> {
    const response = await this.request<GitHubCheckRunsResponse>(
      `/repos/${repository}/commits/${sha}/check-runs?per_page=100`
    );

    return response.check_runs;
  }

  async getContent(repository: string, path: string): Promise<GitHubContentResponse | null> {
    return this.requestOptional(`/repos/${repository}/contents/${path}`);
  }
}

export type { GitHubIssueResponse, GitHubPullResponse, GitHubPullFileResponse, GitHubCheckRunResponse };
