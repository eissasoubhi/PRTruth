# JavaScript / TypeScript test evidence

PRTruth treats JavaScript and TypeScript test evidence conservatively.

The adapter recognizes project signals such as `package.json` and common lockfiles, test files such as `*.test.ts`, `*.spec.tsx`, and paths under `test/`, `tests/`, or `__tests__/`, plus CI checks whose names clearly reference common JavaScript test runners or testing terms.

## Verdict rules

- `PROVEN` — at least one recognizable JavaScript/TypeScript test check exists and every matched check completed successfully.
- `FAILED` — at least one recognizable matched test check completed with a failing conclusion.
- `UNPROVEN` — project/test signals exist but no recognizable CI test check exists, or at least one matched check is still incomplete or otherwise non-successful.
- Not applicable — no JavaScript/TypeScript project, test-file, or test-check signal is present.

A successful build is **not** treated as successful test evidence. PRTruth deliberately avoids turning adjacent CI signals into stronger claims than the evidence supports.

This module is intentionally standalone so it can become an evidence adapter without coupling its detection rules to PR-description claim extraction or GitHub Action integration.
