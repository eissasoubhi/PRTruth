import { execFileSync } from "node:child_process";

export function parseGitHubRepository(remote: string): string | null {
  const normalized = remote.trim().replace(/\.git$/, "");
  const match = normalized.match(/github\.com(?::|\/)([^/]+\/[^/]+)$/i);
  return match?.[1] ?? null;
}

export function detectRepository(): string {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }

  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      encoding: "utf8"
    });
    const repository = parseGitHubRepository(remote);
    if (repository) {
      return repository;
    }
  } catch {
    // Fall through to a useful user-facing error.
  }

  throw new Error(
    "Could not detect the GitHub repository. Run inside a GitHub clone or pass --repo owner/name."
  );
}
