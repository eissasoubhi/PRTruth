# Manual oracle batch 41 — exact-head repository path state

This internal dogfood fixture exercises the exact-head repository-state foundation against a real public history without granting it any new verdict authority.

## Public oracle

- Repository: `ll7/robot_sf_ll7`
- Issue: `#6793`
- Pull request: `#7865`
- Exact PR head: `07ed6f2a498b2d09086ff7f5002c29f1a4a5fa12`

The issue explicitly requires the tracked checkpoint binaries `model/run_023.zip` and `model/run_043.zip` to be removed and replaced by durable release-backed stubs. The pull request performs that cutover.

The independent path-state oracle checks the exact PR head and expects:

- `model/run_023.zip` — absent by an exact-head GitHub Contents API 404;
- `model/run_043.zip` — absent by an exact-head GitHub Contents API 404;
- `model/run_023/README.md` — present;
- `model/run_043/README.md` — present.

## Evidence boundary

A text reader returning no text is **not** evidence that a path is absent: the path might be a binary file, a directory, or another unsupported content shape. Only an exact-head 404 is treated as path absence. Successful but malformed GitHub payloads fail closed rather than being converted into absence.

This batch is intentionally provenance-only. Exact-head path state does not by itself change any requirement to `PROVEN` or `FAILED`; future verdict integration must be reviewed separately with criterion-level scope and contradiction rules.
