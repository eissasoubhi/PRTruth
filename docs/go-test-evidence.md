# Go test evidence

PRTruth treats Go test evidence conservatively.

## Applicability signals

The adapter becomes applicable when it sees at least one of:

- `go.mod`, `go.sum`, `go.work`, or `go.work.sum`;
- a changed `*_test.go` file;
- a recognizable Go test check such as `go test`, `go tests`, `gotest`, or `golang test`.

## Verdict rules

- `FAILED` when a recognized Go test check completed with failure, timeout, cancellation, or action-required status.
- `PROVEN` only when all recognized Go test checks completed successfully.
- `UNPROVEN` when Go signals exist but no recognizable Go test check was reported, or when a matching check is still incomplete.

Generic build or `go vet` checks are deliberately not accepted as proof that tests passed.
