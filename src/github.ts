import type { ChangedFile, CheckEvidence, GitHubIssue, GitHubPullRequest } from './types.js';

const instructionCandidates = [
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  '.github/copilot-instructions.md',
  'GEMINI.md',
];

export class GitHubClient {
  readonly #token?: string;

  constructor(token = process.env.GITHUB_TOKEN) {
    this.#token = token;
  }

  async #request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'prtruth',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.#token) headers.Authorization = `Bearer ${this.#token}`;

    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub API ${response.status} for ${path}: ${detail.slice(0, 300)}`);
    }
    return response.json() as Promise<T>;
  }

  async getIssue(repository: string, issue: number): Promise<GitHubIssue> {
    return this.#request(`/repos/${repository}/issues/${issue}`);
  }

  async getPullRequest(repository: string, pullRequest: number): Promise<GitHubPullRequest> {
    return this.#request(`/repos/${repository}/pulls/${pullRequest}`);
  }

  async getPullFiles(repository: string, pullRequest: number): Promise<ChangedFile[]> {
    const files: ChangedFile[] = [];
    for (let page = 1; ; page += 1) {
      const batch = await this.#request<ChangedFile[]>(
        `/repos/${repository}/pulls/${pullRequest}/files?per_page=100&page=${page}`,
      );
      files.push(...batch);
      if (batch.length < 100) return files;
    }
  }

  async getChecks(repository: string, sha: string): Promise<CheckEvidence[]> {
    const [checks, statuses] = await Promise.all([
      this.#request<{ check_runs: Array<{ name: string; status: string; conclusion: string | null }> }>(
        `/repos/${repository}/commits/${sha}/check-runs?per_page=100`,
      ).catch(() => ({ check_runs: [] })),
      this.#request<{ statuses: Array<{ context: string; state: string }> }>(
        `/repos/${repository}/commits/${sha}/status`,
      ).catch(() => ({ statuses: [] })),
    ]);

    return [
      ...checks.check_runs.map((check) => ({
        name: check.name,
        status: check.status,
        conclusion: check.conclusion,
        source: 'check-run' as const,
      })),
      ...statuses.statuses.map((status) => ({
        name: status.context,
        status: status.state,
        conclusion: status.state,
        source: 'commit-status' as const,
      })),
    ];
  }

  async getInstructionFiles(repository: string): Promise<string[]> {
    const existing = await Promise.all(
      instructionCandidates.map(async (path) => {
        const encoded = path.split('/').map(encodeURIComponent).join('/');
        try {
          await this.#request(`/repos/${repository}/contents/${encoded}`);
          return path;
        } catch {
          return null;
        }
      }),
    );
    return existing.filter((path): path is string => path !== null);
  }
}
