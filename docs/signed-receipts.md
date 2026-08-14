# Signed verification receipts

PRTruth can attach an Ed25519 signature to the exact UTF-8 bytes of a verification receipt.

This primitive is intentionally separate from receipt serialization and hash addressing. The caller chooses the exact receipt bytes to sign, stores the returned base64 signature alongside the receipt, and verifies those same bytes with the corresponding public key.

## Security boundary

A valid signature proves that the holder of the matching private key signed those exact bytes. It does not prove that the underlying evidence is correct, that the key owner is trusted, or that the receipt has a particular schema version.

Any byte-level change to the receipt, including whitespace or newline changes, invalidates the signature. This makes the contract explicit and avoids silently normalizing content before verification.

The initial implementation supports Ed25519 only. Private-key generation, key distribution, rotation, trust policy, and CLI integration remain outside this focused primitive.
