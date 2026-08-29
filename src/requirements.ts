import type { Requirement } from "./types.js";
import {
  extractExplicitRequirements as extractExplicitRequirementsCore,
  extractRequirements as extractRequirementsCore
} from "./requirements-core.js";

const BOLD_LABELED_CRITERION = /^(\s*)\*\*((?:AC|REQ|CRITERION)[-_ ]?\d+(?:\s*\[[^\]]+\])?)\s*[—–]\s*(.+?)\*\*\s*(.*)$/i;
const PLAIN_LABELED_CRITERION = /^(\s*)((?:AC|REQ|CRITERION)[-_ ]?\d+(?:\s*\[[^\]]+\])?)\s*[—–]\s*(.*)$/i;
const BARE_EXPECTED_HEADING = /^(\s*#{1,6}\s+)expected(\s*#*\s*)$/i;

function normalizeIssueMarkdown(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const expected = line.match(BARE_EXPECTED_HEADING);
      if (expected) {
        return `${expected[1] ?? ""}Expected behavior${expected[2] ?? ""}`;
      }

      const bold = line.match(BOLD_LABELED_CRITERION);
      if (bold) {
        const trailing = (bold[4] ?? "").trim();
        return `${bold[1] ?? ""}${bold[2] ?? ""}: ${bold[3] ?? ""}${trailing ? ` ${trailing}` : ""}`;
      }

      const plain = line.match(PLAIN_LABELED_CRITERION);
      if (plain) {
        return `${plain[1] ?? ""}${plain[2] ?? ""}: ${plain[3] ?? ""}`;
      }

      return line;
    })
    .join("\n");
}

export function extractExplicitRequirements(markdown: string): Requirement[] {
  return extractExplicitRequirementsCore(normalizeIssueMarkdown(markdown));
}

export function extractRequirements(markdown: string): Requirement[] {
  return extractRequirementsCore(normalizeIssueMarkdown(markdown));
}
