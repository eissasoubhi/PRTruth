import { describe, expect, it } from "vitest";
import { evidenceGateText } from "../src/evidence-gate-text.js";

describe("evidenceGateText", () => {
  it("removes an explicitly excluded operator-only validation sentence", () => {
    expect(
      evidenceGateText(
        "Lint + unit tests + library and Storybook builds green. VRT is explicitly NOT part of the agent-side verify gate; Denys runs VRT on the Windows machine at PR review."
      )
    ).toBe("Lint + unit tests + library and Storybook builds green.");
  });

  it("keeps a real platform scope that appears before an excluded clause", () => {
    expect(
      evidenceGateText("Tests pass on Windows; Linux is excluded from the CI gate.")
    ).toBe("Tests pass on Windows");
  });

  it("does not alter ordinary scoped validation requirements", () => {
    expect(evidenceGateText("Tests pass on Windows and Linux.")).toBe(
      "Tests pass on Windows and Linux."
    );
  });
});
