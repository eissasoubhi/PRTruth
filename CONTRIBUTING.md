# Contributing to PRTruth

PRTruth is intentionally designed around small, testable extension points.

## Development

Requirements:

- Node.js 22+
- pnpm

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Good contribution areas

- requirement extraction heuristics;
- evidence adapters for languages and test frameworks;
- repository instruction discovery;
- GitHub check/CI evidence;
- terminal and Markdown reporting;
- fixtures reproducing real agent-completion mistakes.

## Pull requests

Keep pull requests focused. Add or update tests for behavior changes and explain the evidence problem the change solves.

A core PRTruth principle is **evidence over confidence**: when the tool cannot justify a claim from concrete artifacts, prefer `UNPROVEN` over a speculative `PROVEN` result.
