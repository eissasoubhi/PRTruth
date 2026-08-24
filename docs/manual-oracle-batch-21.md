# Manual oracle batch 21 — Android/Kotlin watering transparency

## Case

- Repository: `LocNgu/YAPT-Yet-Another-Plant-Tracker`
- Issue: #572 — `Feature: "Why this date?" watering transparency sheet`
- Pull request: #584 — merged on 2026-08-24
- Exact PR head inspected: `cb62d4f6647081a3f4854015404cc18adb905ad5`

The issue contains 11 explicit acceptance criteria. This batch deliberately adds an Android/Kotlin + Jetpack Compose + Room/DataStore case, including UI semantics, persistence, migration, date formatting and product-documentation claims.

## Independent evidence review

The exact-head `Android CI/CD` workflow completed successfully. Its jobs include `Unit Tests & Lint`, `Build & Test`, and `Instrumented Tests`; observable successful steps include Detekt, unit tests, lint, APK build and instrumented tests.

The diff also contains focused implementation and regression evidence:

- `WateringExplanationSheet.kt` renders the sheet from a `WateringExplanation` value rather than re-deriving scheduling math in Compose. It uses `DateUtils.formatRelative()` for last-watered and adjustment dates, hides adaptive-only rows when their values are absent, and renders confidence with a visible text label while the dots remain decorative.
- `WateringExplanationBuilderTest.kt` explicitly checks the degraded adaptive-off shape, seasonal-row visibility, pinned behavior, confidence buckets, and that `effectiveIntervalDays` equals `CareSchedule.effectiveWateringIntervalDaysForDisplay(...)`.
- the PR adds a persistent adjustments table/repository plus migration and backup coverage, DataStore setting wiring, silent-apply/undo behavior, Compose/instrumented tests, strings resources, ADR updates, changelog and What's New changes.

## Human oracle

The independent factual assessment is **11/11 PROVEN** for the issue's acceptance criteria. This is based on the combination of the exact diff, targeted tests and exact-head Android CI, not on the PR author's checklist or PRTruth's result.

A key evidence-boundary lesson remains: a generic green `Unit Tests & Lint` or `Instrumented Tests` job does not by itself prove an arbitrary product requirement such as "every displayed number matches CareSchedule" or "UI tests assert semantics rather than tree structure". Those conclusions require trustworthy association between the concrete source/test evidence and the requirement.

## PRTruth comparison

The automated batch records PRTruth's current requirement statuses on this real issue/PR pair. Any disagreement must be classified before changing verifier semantics.

Expected safe classifications for unresolved rows are **missing deterministic source/test association adapters**, not permission to promote by keyword similarity. The recently added workflow-source parser is provenance enrichment only and must not be treated as proof without exact-run/source binding.

No project-specific heuristic should be added for Kotlin, Compose, Room, DataStore, `CareSchedule`, or this repository merely to make this case pass.
