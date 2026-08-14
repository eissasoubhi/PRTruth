import { createHash } from "node:crypto";

import type { VerificationReport } from "./types.js";

export interface HashAddressedReceipt {
  algorithm: "sha256";
  digest: string;
  uri: `sha256:${string}`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }

  return value;
}

export function canonicalVerificationReport(report: VerificationReport): string {
  return JSON.stringify(canonicalize(report));
}

export function hashVerificationReport(report: VerificationReport): HashAddressedReceipt {
  const digest = createHash("sha256")
    .update(canonicalVerificationReport(report), "utf8")
    .digest("hex");

  return {
    algorithm: "sha256",
    digest,
    uri: `sha256:${digest}`,
  };
}

export function verifyVerificationReportHash(
  report: VerificationReport,
  expected: Pick<HashAddressedReceipt, "algorithm" | "digest">,
): boolean {
  if (expected.algorithm !== "sha256") {
    return false;
  }

  return hashVerificationReport(report).digest === expected.digest;
}
