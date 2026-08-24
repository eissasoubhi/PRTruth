# Manual oracle batch 27 — Windows ETW error propagation

## Public case

- Repository: `Karib0u/rustinel`
- Issue: `#256` — `fix(sensor): ETW start failures are reported as success, hiding the real error`
- Pull request: `#269` — `fix(sensor): propagate ETW trace failures instead of reporting success`
- Exact candidate head: `4a8d6932be2daad024c35df5f80de3f374bff04a`
- Ecosystem: Rust on Windows, ETW sensor/runtime

The issue contains four explicit acceptance criteria. The candidate PR is merged upstream and changes only `src/sensor/windows/etw.rs` and `src/runtime/windows.rs`.

## Independent oracle

Human factual verdict: **4 PROVEN / 0 FAILED / 0 UNPROVEN**.

| Acceptance criterion | Human verdict | Independent evidence | PRTruth classification target |
| --- | --- | --- | --- |
| A `trace.process()` failure while running propagates as `Err`, not `Ok(())` | PROVEN | `EtwSensor::start` now returns `Err(anyhow!(...))` whenever `trace.process()` fails while `shutdown == false` | source/control-flow semantic adapter missing if PRTruth remains `UNPROVEN` |
| The `run` and `capture` failure paths name the underlying ETW error | PROVEN | `run_edr` now matches `Ok(Err(err))` and logs `ETW session failed: {err:#}`; existing `run_capture` already converts `Ok(Err(err))` into the same underlying-error-bearing message and marks the capture incomplete | source semantic + cross-file path association missing if `UNPROVEN` |
| Shutdown-initiated trace ends remain a normal, non-error path | PROVEN | the shutdown branch of `EtwSensor::start` is unchanged and returns `Ok(())`; `run_edr` treats `Ok(Ok(()))` as normal shutdown completion | source/control-flow semantic adapter missing if `UNPROVEN` |
| A transient start failure does not silently look like a clean session end | PROVEN | any unexpected `trace.process()` failure while the sensor is running takes the new `Err` branch; both runtime consumers now distinguish that from `Ok(())` | source/control-flow semantic adapter missing if `UNPROVEN` |

## Exact-head GitHub evidence

The exact PR head has a successful GitHub Actions `CI` run. Its Windows jobs include:

- `Tests (Windows)` → `cargo test --locked --verbose` completed successfully;
- `Clippy (Windows)` → `cargo clippy --locked --all-targets -- -D clippy::all` completed successfully.

Linux/macOS test and lint jobs, Rustfmt, supply-chain checks, and the separate RSigma parity workflow are also green. This is useful platform-scoped execution evidence, but it is not by itself proof that a real transient ETW/WMI failure was injected on CI.

The PR body separately reports Windows 11 lab validation with `cargo check`, `cargo clippy`, and `cargo test` (`345 passed`). That statement supports the human review context but remains author-reported rather than independently retained exact-head runtime fault-injection evidence.

## Why this case matters

This batch adds a different evidence shape from the previous corpus:

1. the required behavior is directly visible in a small control-flow diff;
2. exact-head CI runs on the target operating system;
3. nevertheless, generic green Windows tests should not be treated as proof that an actual ETW provider fault occurred during CI;
4. the factual requirement can still be established by deterministic source semantics because the relevant branch is explicit and exhaustive.

That distinction matters for future adapters. PRTruth should be able to consume source-level facts such as “this error branch returns `Err` instead of `Ok`” without pretending that Windows CI injected the production ETW fault. Provenance scope and semantic proof are separate concerns.

## Conservative policy

No Rust-, Windows-, ETW-, or project-name keyword heuristic should be added merely to make this case pass. If PRTruth remains `UNPROVEN`, classify the disagreement as a missing deterministic source/control-flow adapter unless a narrower verifier defect is independently reproduced.

The batch workflow protects the four-requirement extraction boundary and prevents a global verdict from hiding non-PROVEN requirement rows.
