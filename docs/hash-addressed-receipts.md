# Hash-addressed verification receipts

PRTruth can derive a stable SHA-256 content address from a completed `VerificationReport`.

## Why

A hash-addressed receipt lets downstream systems identify the exact verification payload they reviewed without trusting a mutable filename, URL, or database row. If the report, verdict, requirement status, or evidence changes, the digest changes too.

## Contract

`hashVerificationReport(report)` returns:

```ts
{
  algorithm: "sha256",
  digest: "<64 lowercase hex characters>",
  uri: "sha256:<digest>"
}
```

Before hashing, object keys are sorted recursively and the report is serialized as canonical compact JSON. Array order is preserved because it is part of the report's meaning.

`verifyVerificationReportHash(report, receipt)` recomputes the digest and returns whether the supplied report still matches the receipt.

## Security boundary

A content hash detects accidental or malicious modification of a receipt payload, but it does **not** prove who produced the report. Authenticity requires a signature or another trusted attestation layer, which is intentionally outside this focused primitive.

The hash also does not strengthen weak evidence: an `UNPROVEN` result remains `UNPROVEN` even when its receipt is perfectly hash-addressed.
