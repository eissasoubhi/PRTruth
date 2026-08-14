import { describe, expect, it } from "vitest";

import { assessApiSchemaCompatibilityEvidence } from "../src/adapters/api-schema-compatibility-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessApiSchemaCompatibilityEvidence", () => {
  it("proves compatibility when recognized checks all succeed", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["openapi.yaml", "proto/user.proto"],
      [
        check("oasdiff breaking changes", "completed", "success"),
        check("buf breaking", "completed", "success"),
      ],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(2);
    expect(result.signals).toContain("schema:openapi.yaml");
    expect(result.signals).toContain("schema:proto/user.proto");
  });

  it("fails when a recognized compatibility check fails", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["api/swagger.json"],
      [check("API compatibility", "completed", "failure")],
    );

    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while a compatibility check is incomplete", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["schema.graphql"],
      [check("GraphQL Inspector", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when schema files change without compatibility CI", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["docs/openapi.yml"],
      [check("tests", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });

  it("recognizes compatibility CI even when no schema file is changed", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["src/controller.ts"],
      [check("schema diff", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
  });

  it("does not treat generic tests or builds as compatibility proof", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["openapi.json"],
      [
        check("tests", "completed", "success"),
        check("build", "completed", "success"),
      ],
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });

  it("is not applicable without schema or compatibility signals", () => {
    const result = assessApiSchemaCompatibilityEvidence(
      ["README.md", "src/index.ts"],
      [check("lint", "completed", "success")],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
  });
});
