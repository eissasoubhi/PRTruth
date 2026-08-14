# Python / pytest evidence

PRTruth treats Python test evidence conservatively.

The adapter recognizes Python project signals such as `pyproject.toml`, `requirements*.txt`, `setup.py`, `setup.cfg`, `tox.ini`, and `pytest.ini`; pytest-style test files and test directories; and CI checks whose names explicitly reference pytest or Python tests.

## Verdict rules

- `PROVEN` — at least one recognizable pytest check exists and every matched check completed successfully.
- `FAILED` — at least one recognizable matched pytest check completed with a failing conclusion.
- `UNPROVEN` — Python/pytest signals exist but no recognizable pytest CI check exists, or at least one matched check is incomplete or otherwise non-successful.
- Not applicable — no Python project, pytest test-file, or pytest-check signal is present.

A successful build, lint, typecheck, or unrelated test framework check is **not** treated as pytest evidence. PRTruth only promotes evidence that directly supports the claim being assessed.

This adapter is intentionally standalone so it can evolve independently from the JavaScript/TypeScript and PHPUnit adapters.
