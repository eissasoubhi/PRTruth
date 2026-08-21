# Security Policy

PRTruth processes repository metadata, pull-request evidence, GitHub tokens, and CI context. Security reports are treated as high priority, especially when they could affect credential handling, GitHub Action execution, release integrity, or evidence correctness.

## Supported versions

Security fixes are provided for the latest published PRTruth release. If a fix requires a new package version, the release is not considered complete until the exact public npm package has been independently installed and executed successfully.

## Reporting a vulnerability

Please do not publish exploit details, credentials, private repository data, or other sensitive information in a public issue.

Use GitHub's private vulnerability reporting for this repository when the **Report a vulnerability** option is available on the Security tab. Include:

- the affected PRTruth version or commit;
- the affected surface, such as CLI, GitHub Action, release workflow, receipt verification, or GitHub API handling;
- reproduction steps or a minimal proof of concept;
- the security impact you observed;
- any safe mitigation you have already tested.

If private vulnerability reporting is not available, open a public issue containing only a request for a private reporting channel. Do not include vulnerability details in that issue.

## Security-sensitive areas

Reports are especially useful for:

- GitHub token or credential exposure;
- command or workflow injection;
- unsafe handling of untrusted pull-request content;
- release, npm, provenance, or package-integrity bypasses;
- signature, hash, or verification-receipt weaknesses;
- authorization or private-repository data leaks;
- evidence bugs that can turn untrusted or unrelated data into a false `PROVEN` result.

## Disclosure

Please allow time to reproduce and fix the issue before public disclosure. Once a fix is available and its release has been independently verified, coordinated disclosure is welcome.

PRTruth intentionally fails closed where evidence is incomplete. A security-related uncertainty should remain `UNPROVEN` rather than being upgraded by guesswork.
