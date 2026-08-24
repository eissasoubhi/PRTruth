# Manual oracle Batch 20 — TypeORM migration lifecycle

Public case: `NovaCoreLabs1/NovaLabs` issue #228 / PR #246, exact candidate head `d7eac28ddd1539216f49f79a8e4b877626f608d5`.

## Why this case

This batch exercises a database-specific evidence shape that earlier corpus entries do not cover together: a shared runtime/CLI configuration, environment-dependent `synchronize` behavior, a committed TypeORM baseline migration, migration execution against an empty PostgreSQL service, a schema-drift gate, a post-migration SQL assertion, and a rollback requirement.

The issue contains exactly six explicit acceptance criteria. Current PRTruth extracts exactly those six and reports `0 PROVEN / 0 FAILED / 6 UNPROVEN` (`NOT_PROVEN`). No extraction defect was found.

## Independent oracle

| # | Acceptance criterion | Human verdict | Evidence and boundary | PRTruth | Classification |
| --- | --- | --- | --- | --- | --- |
| 1 | Standalone TypeORM config exists, reuses app connection resolution, and all four `typeorm:*` scripts run successfully | `UNPROVEN` | The diff directly proves the config exists and `app.module.ts` consumes the same `buildTypeOrmOptions`. Exact-head CI executes `typeorm:run-migrations`; the drift gate internally invokes `migration:generate`. It does not observably execute all four scripts, so the full conjunction is not proven by trusted public evidence. | `UNPROVEN` | Correct conservative ceiling for a compound execution requirement. |
| 2 | `synchronize` is disabled in production and remains enabled in local development | `PROVEN` | `buildTypeOrmOptions` sets `synchronize: getEnv('NODE_ENV') !== 'production'`; the application consumes that builder, and the exact-head test suite includes a successful `typeorm.config.spec.ts`. | `UNPROVEN` | Missing deterministic source-invariant + focused-test adapter. |
| 3 | A baseline migration capturing the current entity schema is committed | `PROVEN` | `BaselineSchema1735689600000.ts` is committed; exact-head CI applies it to an empty PostgreSQL database and the subsequent TypeORM generation check reports no schema drift. Together those observations strongly support that the committed baseline reproduces the current entity schema. | `UNPROVEN` | Missing migration/source + fresh-database execution adapter. |
| 4 | `run-migrations` applies cleanly to a fresh database and `revert-migration` rolls it back | `UNPROVEN` | Exact-head CI directly proves the fresh-database apply half. The PR body reports a local revert/reapply exercise and the migration has a `down()` implementation, but exact-head GitHub evidence does not execute `revert-migration`. A successful apply must not imply a successful rollback. | `UNPROVEN` | Correct conservative ceiling for incomplete observable execution evidence. |
| 5 | CI runs a schema-drift check that fails when entities change without a migration | `PROVEN` | The workflow contains and executes `Schema drift check`; its script runs `migration:generate`, returns success only for TypeORM's explicit no-change result, and exits 1 when a migration is generated. Exact-head CI executes the no-drift branch successfully. | `UNPROVEN` | Missing deterministic workflow/script semantics adapter; no fuzzy step-name matching added. |
| 6 | Multi-tenant `hubId` columns exist after migration from empty | `PROVEN` | Exact-head CI first applies migrations to the fresh PostgreSQL service, then queries `information_schema.columns` and prints `hubId columns found: 7`; the step succeeds. | `UNPROVEN` | Missing structured command/output adapter for database assertions. |

Human requirement-level result: **4 PROVEN / 0 FAILED / 2 UNPROVEN**. Human issue-level result remains **NOT_PROVEN** because two compound execution criteria lack complete observable proof.

## Exact-head CI observations

The public PR head has one successful CI workflow. Its `Backend (NestJS)` job executes these relevant steps in order:

1. `Build (TypeScript check)` — success.
2. `Apply migrations to a fresh database` — success against a `postgres:16-alpine` service. The TypeORM log reports zero migrations already loaded, one source migration found, and the baseline migration executed successfully.
3. `Verify multi-tenant columns after migration` — success, with the observable output `hubId columns found: 7`.
4. `Schema drift check` — success, with the observable output `No schema drift — migrations match entity definitions.`
5. `Unit tests with coverage` — success: 27/27 suites and 250/250 tests, including `src/config/typeorm.config.spec.ts`.

The later Codecov upload reports tokenless-upload errors but is configured non-gating and is unrelated to the six database acceptance criteria. It must not turn database requirements into `FAILED` merely because an external reporting integration emitted errors inside an otherwise successful job.

## Corpus guard

Batch 20 intentionally asserts only the safe boundary:

- exactly six acceptance criteria must be extracted;
- the “all four TypeORM scripts” criterion must not become `PROVEN` from a generic green backend job;
- the rollback criterion must not become `PROVEN` merely because forward migration succeeded;
- the issue must not become globally `PROVEN` while those execution gaps remain.

It deliberately does **not** freeze the other four criteria as `UNPROVEN`. A future deterministic adapter may safely prove them if it can bind exact workflow source, command execution, ordered database state and structured/log output without relying on lexical similarity.

## Finding

The useful model distinction is **partial proof inside compound operational requirements**. CI can provide very strong evidence for `apply`, `query`, and `drift` while still lacking evidence for `revert` or for every sibling CLI command named in the same criterion. PRTruth should eventually represent or consume such evidence composition explicitly; until then, retaining the whole compound criterion as `UNPROVEN` is safer than promoting it from nearby green checks.
