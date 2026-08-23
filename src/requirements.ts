import type { Requirement } from "./types.js";

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const BOLD_HEADING = /^\s*\*\*(.+?)\*\*\s*$/;
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;
const ACCEPTANCE_SECTION = /^(?:acceptance criteria|requirements?|definition of done|success criteria|criteria)$/i;
const EXPECTED_SECTION = /^(?:expected behavior|desired behavior|expected result|desired result)$/i;
const EXCLUDED_SECTION = /^(?:contributor checklist|checklist|out of scope|to reproduce|steps? to reproduce|reproduction(?: steps?)?|how (?:has this been )?tested|testing instructions?|references?|technical notes?|screenshots?|additional notes?)$/i;

type MarkdownHeading = {
  kind: "atx" | "bold";
  level: number;
  text: string;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeading(value: string): string {
  return normalizeText(value).replace(/[:：]\s*$/, "");
}

function parseHeading(line: string): MarkdownHeading | null {
  const atx = line.match(ATX_HEADING);
  if (atx) {
    return {
      kind: "atx",
      level: atx[1]?.length ?? 7,
      text: normalizeHeading(atx[2] ?? "")
    };
  }

  const bold = line.match(BOLD_HEADING);
  if (bold) {
    return {
      kind: "bold",
      level: 7,
      text: normalizeHeading(bold[1] ?? "")
    };
  }

  return null;
}

function closesSection(section: MarkdownHeading, next: MarkdownHeading): boolean {
  if (section.kind === "bold") return true;
  return next.kind === "atx" && next.level <= section.level;
}

function withIds(requirements: Requirement[]): Requirement[] {
  return dedupe(requirements).map((requirement, index) => ({
    ...requirement,
    id: `REQ-${index + 1}`
  }));
}

function dedupe(requirements: Requirement[]): Requirement[] {
  const seen = new Set<string>();
  return requirements.filter((requirement) => {
    const key = requirement.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listRequirement(
  rawItem: string,
  source: Requirement["source"],
  index: number
): Requirement | null {
  const checkbox = rawItem.match(/^\[([ xX])\]\s+(.+)$/);
  const text = normalizeText(checkbox?.[2] ?? rawItem);
  if (!text) return null;

  return {
    id: `REQ-${index}`,
    text,
    source,
    ...(checkbox ? { checked: (checkbox[1] ?? "").toLowerCase() === "x" } : {})
  };
}

function extractAcceptanceSections(lines: string[]): Requirement[] {
  let section: MarkdownHeading | null = null;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (section && closesSection(section, heading)) section = null;
      if (ACCEPTANCE_SECTION.test(heading.text)) section = heading;
      continue;
    }

    if (!section) continue;
    const item = line.match(LIST_ITEM);
    if (!item) continue;

    const requirement = listRequirement(
      item[1] ?? "",
      "acceptance-section",
      requirements.length + 1
    );
    if (requirement) requirements.push(requirement);
  }

  return requirements;
}

function extractNonBoilerplateChecklist(lines: string[]): Requirement[] {
  let excludedSection: MarkdownHeading | null = null;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (excludedSection && (closesSection(excludedSection, heading) || heading.kind === "bold")) {
        excludedSection = null;
      }
      if (EXCLUDED_SECTION.test(heading.text)) excludedSection = heading;
      continue;
    }

    if (excludedSection) continue;
    const match = line.match(CHECKBOX);
    if (!match) continue;

    requirements.push({
      id: `REQ-${requirements.length + 1}`,
      text: normalizeText(match[2] ?? ""),
      source: "issue-checklist",
      checked: (match[1] ?? "").toLowerCase() === "x"
    });
  }

  return requirements;
}

function extractExpectedBehavior(lines: string[]): Requirement[] {
  let section: MarkdownHeading | null = null;
  let paragraph: string[] = [];
  const requirements: Requirement[] = [];

  const flushParagraph = () => {
    const text = normalizeText(paragraph.join(" "));
    paragraph = [];
    if (text.length < 8) return;
    requirements.push({
      id: `REQ-${requirements.length + 1}`,
      text,
      source: "issue-list"
    });
  };

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (section && (closesSection(section, heading) || section.kind === "bold")) {
        flushParagraph();
        section = null;
      }
      if (EXPECTED_SECTION.test(heading.text)) {
        flushParagraph();
        section = heading;
      }
      continue;
    }

    if (!section) continue;

    const item = line.match(LIST_ITEM);
    if (item) {
      flushParagraph();
      const requirement = listRequirement(
        item[1] ?? "",
        "issue-list",
        requirements.length + 1
      );
      if (requirement) requirements.push(requirement);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^```|^~~~|^>|^<!--/.test(trimmed)) continue;
    paragraph.push(trimmed);
  }

  flushParagraph();
  return requirements;
}

function extractFallbackLists(lines: string[]): Requirement[] {
  let excludedSection: MarkdownHeading | null = null;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (excludedSection && (closesSection(excludedSection, heading) || heading.kind === "bold")) {
        excludedSection = null;
      }
      if (EXCLUDED_SECTION.test(heading.text)) excludedSection = heading;
      continue;
    }

    if (excludedSection) continue;
    const item = line.match(LIST_ITEM);
    if (!item) continue;

    const requirement = listRequirement(
      item[1] ?? "",
      "issue-list",
      requirements.length + 1
    );
    if (requirement && requirement.text.length >= 8) requirements.push(requirement);
  }

  return requirements;
}

export function extractRequirements(markdown: string): Requirement[] {
  const lines = markdown.split(/\r?\n/);

  // An explicit acceptance/requirements section is the strongest statement of
  // issue intent. Do not mix unrelated issue-template checklists into it.
  const acceptance = extractAcceptanceSections(lines);
  if (acceptance.length > 0) return withIds(acceptance);

  // Simple issues often consist of task boxes without a dedicated acceptance
  // heading. Keep those, but exclude contributor/reproduction boilerplate.
  const checklist = extractNonBoilerplateChecklist(lines);
  if (checklist.length > 0) return withIds(checklist);

  // Bug reports frequently express the desired state as prose under an
  // Expected behavior heading. Prefer that over numbered reproduction steps.
  const expected = extractExpectedBehavior(lines);
  if (expected.length > 0) return withIds(expected);

  // Last-resort compatibility for simple list-based issues. Known procedural
  // sections remain excluded so reproduction instructions are never treated as
  // completion requirements merely because they are numbered.
  return withIds(extractFallbackLists(lines));
}
