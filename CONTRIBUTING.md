# Contributing to PRTruth

Thanks for helping make AI-generated changes easier to verify.

PRTruth has one core rule: **evidence over confidence**. Contributions should preserve that rule. A heuristic may suggest where evidence exists, but PRTruth should not mark a requirement `PROVEN` unless the evidence justifies it.

## Development

Requirements:

- Node.js 22.12+
- pnpm

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Pull requests

Keep pull requests focused on one concern. Include:

- the problem being solved;
- the verification behavior before and after the change;
- tests for new deterministic behavior;
- documentation when a CLI contract changes.

Avoid combining refactors with behavior changes unless necessary.

## Good contribution areas

PRTruth is intentionally modular. Useful contribution areas include:

- additional repository instruction formats;
- GitHub evidence sources;
- acceptance-criteria extraction;
- test/build/lint check detection;
- terminal and Markdown report UX;
- fixtures for real-world GitHub issue styles;
- language/framework-specific evidence adapters.

## Evidence semantics

Use these outcomes consistently:

- `PROVEN`: concrete evidence establishes the requirement.
- `FAILED`: concrete evidence contradicts the requirement or a required verification failed.
- `UNPROVEN`: evidence is missing, ambiguous, or insufficient.

When uncertain, prefer `UNPROVEN`.

## Tests

Every deterministic rule should have tests for both the positive case and at least one case where PRTruth must refuse to overclaim.

## Security

Do not include credentials, private repository content, or GitHub tokens in fixtures, logs, screenshots, or pull-request descriptions.
