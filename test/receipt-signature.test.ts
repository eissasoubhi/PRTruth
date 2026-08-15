import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  signVerificationReceipt,
  verifyVerificationReceiptSignature
} from "../src/receipt-signature.js";

function keyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

describe("verification receipt signatures", () => {
  it("signs and verifies exact receipt bytes", () => {
    const keys = keyPair();
    const receipt = '{"schemaVersion":1,"verdict":"PROVEN"}\n';
    const signed = signVerificationReceipt(receipt, keys.privateKeyPem);

    expect(signed.algorithm).toBe("ed25519");
    expect(verifyVerificationReceiptSignature(receipt, signed, keys.publicKeyPem)).toBe(true);
  });

  it("rejects a modified receipt", () => {
    const keys = keyPair();
    const receipt = '{"verdict":"PROVEN"}';
    const signed = signVerificationReceipt(receipt, keys.privateKeyPem);

    expect(
      verifyVerificationReceiptSignature('{"verdict":"FAILED"}', signed, keys.publicKeyPem)
    ).toBe(false);
  });

  it("rejects a signature checked with the wrong key", () => {
    const signer = keyPair();
    const verifier = keyPair();
    const receipt = '{"verdict":"PROVEN"}';
    const signed = signVerificationReceipt(receipt, signer.privateKeyPem);

    expect(
      verifyVerificationReceiptSignature(receipt, signed, verifier.publicKeyPem)
    ).toBe(false);
  });

  it("rejects malformed signature data instead of throwing", () => {
    const keys = keyPair();

    expect(
      verifyVerificationReceiptSignature(
        '{"verdict":"PROVEN"}',
        { algorithm: "ed25519", signature: "%%%not-base64%%%" },
        keys.publicKeyPem
      )
    ).toBe(false);
  });
});
