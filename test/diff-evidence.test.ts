import { describe, expect, it } from "vitest";
import { findPatchCandidateEvidence } from "../src/diff-evidence.js";

const composerRetryPatch = `@@ -51,7 +51,26 @@ jobs:
       - name: Install backend dependencies
         working-directory: api
-        run: composer install --no-interaction --prefer-dist --no-progress
+        env:
+          COMPOSER_MAX_PARALLEL_HTTP: 1
+        run: |
+          set -euo pipefail
+          for attempt in 1 2 3 4 5; do
+            if composer install --no-interaction --prefer-dist --no-progress; then
+              exit 0
+            fi
+            if [ "$attempt" -eq 5 ]; then
+              exit 1
+            fi
+            echo "::warning::Composer install failed on attempt \${attempt}/5; retrying with the same cache."
+          done`;

describe("patch candidate evidence", () => {
  it("surfaces relevant added lines for a concurrency requirement", () => {
    const evidence = findPatchCandidateEvidence(
      "Composer HTTP download concurrency is reduced for the affected dependency installs.",
      [{ filename: ".github/workflows/ci.yml", patch: composerRetryPatch }]
    );

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.some((item) => item.summary.includes("COMPOSER_MAX_PARALLEL_HTTP: 1"))).toBe(true);
  });

  it("surfaces retry details that can expose a mismatch to a reviewer", () => {
    const evidence = findPatchCandidateEvidence(
      "Backend dependency installation retries up to three times within the same runner.",
      [{ filename: ".github/workflows/ci.yml", patch: composerRetryPatch }]
    );

    expect(evidence.some((item) => item.summary.includes("attempt ${attempt}/5"))).toBe(true);
  });

  it("surfaces cache reuse language", () => {
    const evidence = findPatchCandidateEvidence(
      "Successful downloads are reused between attempts through Composer's local cache.",
      [{ filename: ".github/workflows/ci.yml", patch: composerRetryPatch }]
    );

    expect(evidence.some((item) => item.summary.includes("same cache"))).toBe(true);
  });

  it("ignores weak one-token coincidences", () => {
    const evidence = findPatchCandidateEvidence(
      "Only administrators can delete users.",
      [{ filename: "src/admin.ts", patch: "@@ -1,1 +1,1 @@\n+const admin = true;" }]
    );

    expect(evidence).toEqual([]);
  });

  it("returns only diff evidence candidates and never a verdict", () => {
    const evidence = findPatchCandidateEvidence(
      "Backend dependency installation retries up to three times.",
      [{ filename: ".github/workflows/ci.yml", patch: composerRetryPatch }]
    );

    expect(evidence.every((item) => item.kind === "diff")).toBe(true);
    expect(evidence.every((item) => !("status" in item))).toBe(true);
  });
});
