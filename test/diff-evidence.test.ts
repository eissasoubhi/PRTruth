import { describe, expect, it } from "vitest";
import {
  findPatchCandidateEvidence,
  findQuantitativePatchMismatchEvidence
} from "../src/diff-evidence.js";

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

const deletionPatch = `@@ -10,7 +10,3 @@ class Diagnostic
-  def unused_legacy_helper
-    legacy_payload
-  end
-
   def place
     @place
   end`;

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

  it("flags a possible quantitative retry mismatch without inventing a verdict", () => {
    const evidence = findQuantitativePatchMismatchEvidence(
      "Backend dependency installation retries up to three times within the same runner.",
      [{ filename: ".github/workflows/ci.yml", patch: composerRetryPatch }]
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.summary).toContain("Possible quantitative mismatch");
    expect(evidence[0]?.summary).toContain("requirement quantity 3");
    expect(evidence[0]?.summary).toContain("patch retry/attempt quantity 5");
    expect(evidence.every((item) => !("status" in item))).toBe(true);
  });

  it("does not flag a retry quantity that matches the requirement", () => {
    const matchingPatch = composerRetryPatch.replaceAll("/5", "/3");
    const evidence = findQuantitativePatchMismatchEvidence(
      "Backend dependency installation retries up to three times within the same runner.",
      [{ filename: ".github/workflows/ci.yml", patch: matchingPatch }]
    );

    expect(evidence).toEqual([]);
  });

  it("uses the total from 'attempt current of total' instead of the current counter", () => {
    const patch = "@@ -1,1 +1,1 @@\n+echo \"Install failed on attempt ${attempt} of 5; retrying\"";
    const evidence = findQuantitativePatchMismatchEvidence(
      "Dependency install retries up to five attempts.",
      [{ filename: ".github/workflows/ci.yml", patch }]
    );

    expect(evidence).toEqual([]);
  });

  it("flags the total from 'attempt current of total' when it differs", () => {
    const patch = "@@ -1,1 +1,1 @@\n+echo \"Install failed on attempt ${attempt} of 5; retrying\"";
    const evidence = findQuantitativePatchMismatchEvidence(
      "Dependency install retries up to three attempts.",
      [{ filename: ".github/workflows/ci.yml", patch }]
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.summary).toContain("requirement quantity 3");
    expect(evidence[0]?.summary).toContain("patch retry/attempt quantity 5");
  });

  it("does not treat a bare current attempt counter as the configured retry total", () => {
    const patch = "@@ -1,1 +1,1 @@\n+echo \"Install failed on attempt 1; retrying\"";
    const evidence = findQuantitativePatchMismatchEvidence(
      "Dependency install retries up to three attempts.",
      [{ filename: ".github/workflows/ci.yml", patch }]
    );

    expect(evidence).toEqual([]);
  });

  it("ignores unrelated numeric changes", () => {
    const evidence = findQuantitativePatchMismatchEvidence(
      "Backend dependency installation retries up to three times within the same runner.",
      [{
        filename: ".github/workflows/ci.yml",
        patch: "@@ -1,1 +1,2 @@\n+timeout-minutes: 15\n+cache-version: 5"
      }]
    );

    expect(evidence).toEqual([]);
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

  it("surfaces removed lines as reviewer-navigation evidence for deletion requirements", () => {
    const evidence = findPatchCandidateEvidence(
      "Remove the unused legacy helper method.",
      [{ filename: "lib/diagnostic.rb", patch: deletionPatch }]
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.summary).toContain("Removed patch candidate");
    expect(evidence[0]?.summary).toContain("unused_legacy_helper");
    expect(evidence.every((item) => !("status" in item))).toBe(true);
  });

  it("does not surface removed lines for statements without deletion intent", () => {
    const evidence = findPatchCandidateEvidence(
      "Document the unused legacy helper method.",
      [{ filename: "lib/diagnostic.rb", patch: deletionPatch }]
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
