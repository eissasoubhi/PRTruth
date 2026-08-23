import { describe, expect, it } from "vitest";
import { selectTrustedCommentRequirements } from "../src/comment-requirements.js";
import { extractExplicitRequirements } from "../src/requirements.js";

describe("maintainer-comment acceptance criteria", () => {
  it("parses labeled multi-line criteria from qualified acceptance headings", () => {
    const result = extractExplicitRequirements(`
## Acceptance criteria (feature-capsule)

Owned-by: @maintainer
Scope: V1

AC-1: public compute_cost is importable and returns Decimal | None.
  It must match the independent rate oracle.
AC-2: honest None — unknown models return None.
  Never return a partial computation.
AC-3: Client.complete() carries usage.cost_usd.
`);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.text)).toEqual([
      "public compute_cost is importable and returns Decimal | None. It must match the independent rate oracle.",
      "honest None — unknown models return None. Never return a partial computation.",
      "Client.complete() carries usage.cost_usd."
    ]);
  });

  it("uses the latest ratified criteria from a trusted maintainer comment", () => {
    const result = selectTrustedCommentRequirements(
      "Acceptance criteria for this issue follow in a maintainer comment.",
      [
        {
          authorAssociation: "COLLABORATOR",
          body: "Adopting criteria.\n\n## Acceptance criteria\n- First version"
        },
        {
          authorAssociation: "CONTRIBUTOR",
          body: "Ratifying my proposal.\n\n## Acceptance criteria\n- Malicious contributor override"
        },
        {
          authorAssociation: "MEMBER",
          body: "Possible revision for discussion.\n\n## Acceptance criteria\n- Unratified maintainer draft"
        },
        {
          authorAssociation: "MEMBER",
          body: "Ratifying revised criteria; supersedes the prior set.\n\n## Acceptance criteria\n- Final version\n- Tests pass"
        }
      ]
    );

    expect(result.map((item) => item.text)).toEqual(["Final version", "Tests pass"]);
  });

  it("does not elevate ordinary contributor or bot comments into requirements", () => {
    const result = selectTrustedCommentRequirements(
      "Acceptance criteria follow in a maintainer comment.",
      [
        {
          authorAssociation: "CONTRIBUTOR",
          body: "Ratifying proposal.\n\n## Acceptance criteria\n- Contributor proposal"
        },
        {
          authorAssociation: "NONE",
          body: "Ratifying proposal.\n\n## Acceptance criteria\n- Random user proposal"
        }
      ]
    );

    expect(result).toEqual([]);
  });

  it("does not inspect comment criteria unless the issue explicitly delegates them", () => {
    const result = selectTrustedCommentRequirements(
      "The issue body contains the definition of done.",
      [
        {
          authorAssociation: "MEMBER",
          body: "Ratifying the final criteria.\n\n## Acceptance criteria\n- Binding-looking requirement"
        }
      ]
    );

    expect(result).toEqual([]);
  });
});
