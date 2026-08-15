import { describe, expect, it } from "vitest";

import { assessPhpunitEvidence } from "../src/adapters/phpunit-evidence.js";

const check = (name: string, status: string, conclusion: string | null) => ({
  name,
  status,
  conclusion,
});

describe("assessPhpunitEvidence", () => {
  it("proves PHPUnit evidence when recognized checks all succeed", () => {
    const result = assessPhpunitEvidence(
      ["composer.json", "tests/Service/InvoiceServiceTest.php"],
      [check("phpunit", "completed", "success")],
    );

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("PROVEN");
    expect(result.matchedChecks).toHaveLength(1);
    expect(result.signals).toContain("project:composer.json");
  });

  it("fails when a PHPUnit check fails", () => {
    const result = assessPhpunitEvidence(
      ["phpunit.xml.dist"],
      [check("PHP tests", "completed", "failure")],
    );

    expect(result.status).toBe("FAILED");
  });

  it("stays unproven while PHPUnit is still running", () => {
    const result = assessPhpunitEvidence(
      ["composer.lock"],
      [check("unit tests / phpunit", "in_progress", null)],
    );

    expect(result.status).toBe("UNPROVEN");
  });

  it("stays unproven when PHP signals exist without PHPUnit CI evidence", () => {
    const result = assessPhpunitEvidence(["composer.json", "tests/FooTest.php"], []);

    expect(result.applicable).toBe(true);
    expect(result.status).toBe("UNPROVEN");
  });

  it("ignores unrelated checks", () => {
    const result = assessPhpunitEvidence(
      ["composer.json"],
      [check("phpstan", "completed", "success")],
    );

    expect(result.status).toBe("UNPROVEN");
    expect(result.matchedChecks).toHaveLength(0);
  });

  it("is not applicable outside PHP/PHPUnit projects", () => {
    const result = assessPhpunitEvidence(
      ["package.json", "src/widget.test.ts"],
      [check("vitest", "completed", "success")],
    );

    expect(result.applicable).toBe(false);
    expect(result.status).toBe("UNPROVEN");
  });
});
