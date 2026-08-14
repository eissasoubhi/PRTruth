# API/schema compatibility evidence

PRTruth treats API compatibility as a separate evidence category from ordinary tests and builds.

## Schema signals

The adapter recognizes changed API/schema artifacts including:

- OpenAPI and Swagger YAML/JSON files
- GraphQL schema files
- Protocol Buffer (`.proto`) files

A schema change alone does **not** prove compatibility. Without a dedicated compatibility check, the result remains `UNPROVEN`.

## Recognized compatibility checks

PRTruth recognizes explicit compatibility-oriented CI checks such as:

- API compatibility
- schema diff / schema compatibility
- breaking-change checks
- `oasdiff` / OpenAPI diff
- GraphQL Inspector
- `buf breaking`
- protobuf compatibility checks

Generic `test`, `build`, lint, or typecheck jobs are deliberately excluded because a successful generic job is not evidence that an API change is backward compatible.

## Verdict semantics

- `PROVEN`: every recognized compatibility check completed successfully.
- `FAILED`: at least one recognized compatibility check explicitly failed, timed out, was cancelled, or requires action.
- `UNPROVEN`: schema signals exist without a recognized compatibility check, or a matching check is incomplete/ambiguous.

The adapter prefers `UNPROVEN` over inferring compatibility from weak evidence.
