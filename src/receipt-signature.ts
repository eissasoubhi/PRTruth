import { sign, verify } from "node:crypto";

export interface SignedVerificationReceipt {
  algorithm: "ed25519";
  signature: string;
}

export function signVerificationReceipt(
  receipt: string,
  privateKeyPem: string
): SignedVerificationReceipt {
  const signature = sign(null, Buffer.from(receipt, "utf8"), privateKeyPem);

  return {
    algorithm: "ed25519",
    signature: signature.toString("base64")
  };
}

export function verifyVerificationReceiptSignature(
  receipt: string,
  signedReceipt: SignedVerificationReceipt,
  publicKeyPem: string
): boolean {
  if (signedReceipt.algorithm !== "ed25519") return false;

  try {
    return verify(
      null,
      Buffer.from(receipt, "utf8"),
      publicKeyPem,
      Buffer.from(signedReceipt.signature, "base64")
    );
  } catch {
    return false;
  }
}
