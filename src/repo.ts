import { execFileSync } from 'node:child_process';

export function inferRepository(cwd = process.cwd()): string {
  let remote: string;
  try {
    remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error('Could not infer the GitHub repository. Pass --repo owner/name.');
  }

  const ssh = remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]!.replace(/\.git$/i, '')}`;

  const https = remote.match(/^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (https) return `${https[1]}/${https[2]!.replace(/\.git$/i, '')}`;

  throw new Error(`Unsupported GitHub remote: ${remote}. Pass --repo owner/name.`);
}
