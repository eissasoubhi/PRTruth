import { describe, expect, it } from "vitest";
import {
  selectTrustedCommentRequirements,
  selectTrustedSupportingCommentEvidence
} from "../src/comment-requirements.js";
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

describe("trusted maintainer supporting evidence", () => {
  const requirement = {
    id: "REQ-1",
    text: "Tests green; merged; rolled out; next live occurrence quoted on the issue",
    source: "acceptance-section" as const
  };

  it("surfaces a trusted post-delivery comment explicitly tied to the target PR", () => {
    const evidence = selectTrustedSupportingCommentEvidence(requirement, 65, [
      {
        authorAssociation: "OWNER",
        htmlUrl: "https://github.com/acme/service/issues/10#issuecomment-1",
        body: "PR #65 merged and rolled out. Live since 03:40 UTC; observed the next skipped row."
      }
    ]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      kind: "issue",
      url: "https://github.com/acme/service/issues/10#issuecomment-1"
    });
    expect(evidence[0]?.summary).toContain("Trusted maintainer comment tied to PR #65");
  });

  it("rejects contributor comments and comments not explicitly tied to the target PR", () => {
    const evidence = selectTrustedSupportingCommentEvidence(requirement, 65, [
      {
        authorAssociation: "CONTRIBUTOR",
        body: "PR #65 merged and deployed; live observation confirmed."
      },
      {
        authorAssociation: "MEMBER",
        body: "PR #66 merged and deployed; live observation confirmed."
      },
      {
        authorAssociation: "MEMBER",
        body: "#65 merged and deployed; live observation confirmed."
      }
    ]);

    expect(evidence).toEqual([]);
  });

  it("does not surface unrelated maintainer prose for a non-lifecycle requirement", () => {
    const evidence = selectTrustedSupportingCommentEvidence(
      {
        id: "REQ-2",
        text: "Export endpoint exists",
        source: "acceptance-section"
      },
      65,
      [
        {
          authorAssociation: "OWNER",
          body: "PR #65 merged and deployed successfully."
        }
      ]
    );

    expect(evidence).toEqual([]);
  });
});
