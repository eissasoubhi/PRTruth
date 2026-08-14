# Historical verification comparison

PRTruth can compare two completed verification reports without weakening its evidence semantics.

`compareVerificationReports(before, after)` compares requirement results by stable requirement ID and classifies each requirement as:

- `ADDED` — present only in the newer report;
- `REMOVED` — present only in the older report;
- `IMPROVED` — evidence moved from `FAILED` to `UNPROVEN`/`PROVEN`, or from `UNPROVEN` to `PROVEN`;
- `REGRESSED` — evidence moved in the opposite direction;
- `UNCHANGED` — evidence status did not change.

Added or removed requirements are intentionally not counted as regressions. They represent scope changes, not weaker evidence for the same requirement.

The comparison also preserves both top-level verdicts and exposes aggregate counts for improvements, regressions, additions, and removals. A future CLI/reporting layer can render this data or persist it alongside versioned verification receipts without changing the comparison semantics.
