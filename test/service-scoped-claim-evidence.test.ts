import { describe, expect, it } from "vitest";
import { assessCompletionClaim } from "../src/claim-evidence.js";
import type { CheckRunSummary } from "../src/types.js";

function check(name: string, conclusion: string | null, status = "completed"): CheckRunSummary {
  return { name, conclusion, status };
}

describe("service-scoped CI claim evidence", () => {
  it("does not prove a Redis claim from a generic successful test job", () => {
    const assessment = assessCompletionClaim("Tests pass with Redis", [
      check("backend tests", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
    expect(assessment.reason).toContain("redis");
  });

  it("proves a Redis claim from a matching successful test job", () => {
    const assessment = assessCompletionClaim("Tests pass with Redis", [
      check("backend tests / redis", "success")
    ]);

    expect(assessment.status).toBe("PROVEN");
  });

  it("keeps different service dependencies distinct", () => {
    const assessment = assessCompletionClaim("Tests pass with RabbitMQ", [
      check("integration tests / redis", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
  });

  it("requires a single matching job to cover simultaneously claimed services", () => {
    const assessment = assessCompletionClaim("Tests pass with Redis and RabbitMQ", [
      check("integration tests / redis", "success"),
      check("integration tests / rabbitmq", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");

    const complete = assessCompletionClaim("Tests pass with Redis and RabbitMQ", [
      check("integration tests / redis / rabbitmq", "success")
    ]);

    expect(complete.status).toBe("PROVEN");
  });

  it("scopes Kafka and Elasticsearch claims", () => {
    expect(assessCompletionClaim("Tests pass with Kafka", [
      check("integration tests / kafka", "success")
    ]).status).toBe("PROVEN");

    expect(assessCompletionClaim("Tests pass with Elasticsearch", [
      check("integration tests / elasticsearch", "failure")
    ]).status).toBe("FAILED");
  });

  it("preserves other environment dimensions alongside services", () => {
    const assessment = assessCompletionClaim("Tests pass on Linux ARM64 with Redis", [
      check("integration tests / linux / x64 / redis", "success")
    ]);

    expect(assessment.status).toBe("UNPROVEN");
  });
});
