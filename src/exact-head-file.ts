import { Buffer } from "node:buffer";
import { GitHubApiError } from "./github.js";

export interface ExactHeadTextFile {
  path: string;
  sha: string;
  text: string;
  htmlUrl?: string;
}

interface GitHubContentsFileResponse {
  type: string;
  path: string;
  sha: string;
  encoding?: string;
  content?: string;
  html_url?: string;
}

export interface FetchExactHeadTextFileInput {
  repository: string;
  path: string;
  headSha: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

function isFullCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

function encodeRepositoryPath(path: string): string {
  if (!path || path.startsWith("/") || path.endsWith("/")) {
    throw new Error(`Invalid repository file path: ${path}`);
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Invalid repository file path: ${path}`);
  }

  return segments.map(encodeURIComponent).join("/");
}

function decodeUtf8Base64(content: string): string | null {
  const bytes = Buffer.from(content.replace(/\s+/g, ""), "base64");
  if (bytes.includes(0)) return null;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function fetchExactHeadTextFile(
  input: FetchExactHeadTextFileInput
): Promise<ExactHeadTextFile | null> {
  if (!isFullCommitSha(input.headSha)) {
    throw new Error("Exact-head file evidence requires a full 40-character commit SHA.");
  }

  const encodedPath = encodeRepositoryPath(input.path);
  const apiPath = `/repos/${input.repository}/contents/${encodedPath}?ref=${encodeURIComponent(input.headSha)}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "PRTruth"
  };
  const token = input.token ?? process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await (input.fetchImpl ?? fetch)(`https://api.github.com${apiPath}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub API request failed with status ${response.status}: ${apiPath}`,
      response.status,
      apiPath
    );
  }

  const payload = await response.json() as GitHubContentsFileResponse;
  if (
    payload.type !== "file"
    || payload.path !== input.path
    || payload.encoding !== "base64"
    || typeof payload.content !== "string"
    || !payload.sha
  ) {
    return null;
  }

  const text = decodeUtf8Base64(payload.content);
  if (text === null) return null;

  return {
    path: payload.path,
    sha: payload.sha,
    text,
    ...(payload.html_url ? { htmlUrl: payload.html_url } : {})
  };
}
