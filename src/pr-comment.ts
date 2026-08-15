export const PRTRUTH_COMMENT_MARKER = "<!-- prtruth:verification -->";

interface GitHubIssueComment {
  id: number;
  body: string | null;
  html_url?: string;
}

interface PublishResult {
  action: "created" | "updated";
  commentId: number;
  htmlUrl?: string;
}

interface PublishOptions {
  repository: string;
  prNumber: number;
  body: string;
  token?: string;
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "PRTruth"
  };
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...githubHeaders(token),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

async function findExistingComment(
  repository: string,
  prNumber: number,
  token: string
): Promise<GitHubIssueComment | undefined> {
  for (let page = 1; ; page += 1) {
    const comments = await request<GitHubIssueComment[]>(
      `/repos/${repository}/issues/${prNumber}/comments?per_page=100&page=${page}`,
      token
    );
    const existing = comments.find((comment) => comment.body?.includes(PRTRUTH_COMMENT_MARKER));

    if (existing) return existing;
    if (comments.length < 100) return undefined;
  }
}

export async function upsertPullRequestComment({
  repository,
  prNumber,
  body,
  token = process.env.GITHUB_TOKEN
}: PublishOptions): Promise<PublishResult> {
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to publish a PR evidence comment.");
  }

  const commentBody = `${PRTRUTH_COMMENT_MARKER}\n${body}`;
  const existing = await findExistingComment(repository, prNumber, token);

  if (existing) {
    const updated = await request<GitHubIssueComment>(
      `/repos/${repository}/issues/comments/${existing.id}`,
      token,
      { method: "PATCH", body: JSON.stringify({ body: commentBody }) }
    );

    return {
      action: "updated",
      commentId: updated.id,
      ...(updated.html_url ? { htmlUrl: updated.html_url } : {})
    };
  }

  const created = await request<GitHubIssueComment>(
    `/repos/${repository}/issues/${prNumber}/comments`,
    token,
    { method: "POST", body: JSON.stringify({ body: commentBody }) }
  );

  return {
    action: "created",
    commentId: created.id,
    ...(created.html_url ? { htmlUrl: created.html_url } : {})
  };
}
