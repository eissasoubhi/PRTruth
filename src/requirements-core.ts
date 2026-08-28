import type { Requirement } from "./types.js";

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const BOLD_HEADING = /^\s*\*\*(.+?)\*\*\s*$/;
const PLAIN_SECTION_LABEL = /^\s*([^#*].*?)\s*[:：]\s*$/;
const INLINE_ACCEPTANCE_LABEL = /^\s*\*\*(acceptance(?: criteria)?|requirements?|definition of done|success criteria|criteria)\s*[.:：]\*\*\s+(.+)$/i;
const PLAIN_INLINE_ACCEPTANCE_LABEL = /^\s*(acceptance(?: criteria)?|requirements?|definition of done|success criteria|criteria)\s*[:：]\s+(.+)$/i;
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;
const LABELED_CRITERION = /^\s*(?:AC|REQ|CRITERION)[-_ ]?\d+(?:\s*\[[^\]]+\])?\s*[:.)-]\s*(.*)$/i;
const EXPLICIT_ACCEPTANCE_SECTION = /^(?:acceptance(?: criteria)?|definition of done|success criteria|criteria)(?:\s*\([^)]*\))?$/i;
const ACCEPTANCE_SECTION = /^(?:acceptance(?: criteria)?|requirements?|definition of done|success criteria|criteria)(?:\s*\([^)]*\))?$/i;
const ACCEPTANCE_TEST_SECTION = /^(?:.+\s+)?acceptance tests?(?:\s*\([^)]*\))?$/i;
const EXPECTED_SECTION = /^(?:expected behavior|desired behavior|expected result|desired result)$/i;
const CHANGE_SECTION = /^(?:recommended change|proposed change)(?:\s*\([^)]*\))?$/i;
const EXCLUDED_SECTION = /^(?:contributor checklist|checklist|initial checks?|prerequisites?|affected components?|evidence|build scans?|issue reasons?|out of scope|to reproduce|steps? to reproduce|reproduction(?: steps?)?|how (?:has this been )?tested|testing instructions?|references?|technical notes?|screenshots?|additional notes?)$/i;

type MarkdownHeading = {
  kind: "atx" | "bold" | "plain";
  level: number;
  text: string;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeading(value: string): string {
  return normalizeText(value).replace(/[:：]\s*$/, "");
}

function isKnownSectionHeading(value: string): boolean {
  return (
    ACCEPTANCE_SECTION.test(value) ||
    ACCEPTANCE_TEST_SECTION.test(value) ||
    EXPECTED_SECTION.test(value) ||
    CHANGE_SECTION.test(value) ||
    EXCLUDED_SECTION.test(value)
  );
}

function stripFencedCode(lines: string[]): string[] {
  let fence: "```" | "~~~" | null = null;
  return lines.map((line) => {
    const trimmed = line.trimStart();
    if (!fence) {
      if (trimmed.startsWith("```")) {
        fence = "```";
        return "";
      }
      if (trimmed.startsWith("~~~")) {
        fence = "~~~";
        return "";
      }
      return line;
    }

    if (trimmed.startsWith(fence)) fence = null;
    return "";
  });
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

  const plain = line.match(PLAIN_SECTION_LABEL);
  if (plain) {
    const text = normalizeHeading(plain[1] ?? "");
    if (isKnownSectionHeading(text)) {
      return {
        kind: "plain",
        level: 7,
        text
      };
    }
  }

  return null;
}

function closesSection(section: MarkdownHeading, next: MarkdownHeading): boolean {
  if (section.kind === "bold" || section.kind === "plain") return true;
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

function inlineAcceptanceMatch(line: string): RegExpMatchArray | null {
  return line.match(INLINE_ACCEPTANCE_LABEL) ?? line.match(PLAIN_INLINE_ACCEPTANCE_LABEL);
}

function extractInlineAcceptance(lines: string[]): Requirement[] {
  const requirements: Requirement[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = inlineAcceptanceMatch(lines[index] ?? "");
    if (!match) continue;

    const paragraph = [match[2] ?? ""];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const next = lines[cursor] ?? "";
      if (!next.trim() || parseHeading(next) || inlineAcceptanceMatch(next)) break;
      paragraph.push(next.trim());
      cursor += 1;
    }
    index = cursor - 1;

    const body = normalizeText(paragraph.join(" "));
    if (!body) continue;

    const clauses = body
      .split(/\s*;\s*/)
      .map((clause) => normalizeText(clause))
      .filter((clause) => clause.length >= 8);

    for (const clause of clauses) {
      requirements.push({
        id: `REQ-${requirements.length + 1}`,
        text: clause,
        source: "acceptance-section"
      });
    }
  }

  return requirements;
}

function extractListSections(
  lines: string[],
  sectionPattern: RegExp,
  source: Requirement["source"]
): Requirement[] {
  let section: MarkdownHeading | null = null;
  let current: string[] = [];
  const requirements: Requirement[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const requirement = listRequirement(
      current.join(" "),
      source,
      requirements.length + 1
    );
    current = [];
    if (requirement) requirements.push(requirement);
  };

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (section && closesSection(section, heading)) {
        flush();
        section = null;
      }
      if (sectionPattern.test(heading.text)) {
        flush();
        section = heading;
      }
      continue;
    }

    if (!section) continue;

    const item = line.match(LIST_ITEM);
    if (item) {
      flush();
      current.push(item[1] ?? "");
      continue;
    }

    if (current.length === 0) continue;
    if (!line.trim()) {
      flush();
      continue;
    }

    if (/^\s{2,}\S/.test(line)) {
      current.push(line.trim());
      continue;
    }

    flush();
  }

  flush();
  return requirements;
}

function extractLabeledAcceptanceCriteria(
  lines: string[],
  sectionPattern = ACCEPTANCE_SECTION
): Requirement[] {
  let section: MarkdownHeading | null = null;
  let current: string[] = [];
  const requirements: Requirement[] = [];

  const flush = () => {
    const text = normalizeText(current.join(" "));
    current = [];
    if (!text) return;
    requirements.push({
      id: `REQ-${requirements.length + 1}`,
      text,
      source: "acceptance-section"
    });
  };

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (section && closesSection(section, heading)) {
        flush();
        section = null;
      }
      if (sectionPattern.test(heading.text)) {
        flush();
        section = heading;
      }
      continue;
    }

    if (!section) continue;

    const criterion = line.match(LABELED_CRITERION);
    if (criterion) {
      flush();
      current.push(criterion[1] ?? "");
      continue;
    }

    if (current.length === 0) continue;
    const trimmed = line.trim();
    if (!trimmed || /^>|^<!--/.test(trimmed)) continue;

    const listItem = trimmed.match(LIST_ITEM);
    current.push(listItem?.[1] ?? trimmed);
  }

  flush();
  return requirements;
}

function extractAcceptanceTestSections(lines: string[]): Requirement[] {
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
      source: "acceptance-section"
    });
  };

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (section && closesSection(section, heading)) {
        flushParagraph();
        section = null;
      }
      if (ACCEPTANCE_TEST_SECTION.test(heading.text)) {
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
        "acceptance-section",
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
    if (/^>|^<!--/.test(trimmed)) continue;
    paragraph.push(trimmed);
  }

  flushParagraph();
  return requirements;
}

function extractAcceptanceSections(lines: string[]): Requirement[] {
  const acceptanceTests = extractAcceptanceTestSections(lines);
  const appendAcceptanceTests = (requirements: Requirement[]) => [
    ...requirements,
    ...acceptanceTests
  ];

  const inline = extractInlineAcceptance(lines);
  if (inline.length > 0) return appendAcceptanceTests(inline);

  const explicitLabeled = extractLabeledAcceptanceCriteria(lines, EXPLICIT_ACCEPTANCE_SECTION);
  if (explicitLabeled.length > 0) return appendAcceptanceTests(explicitLabeled);
  const explicitList = extractListSections(
    lines,
    EXPLICIT_ACCEPTANCE_SECTION,
    "acceptance-section"
  );
  if (explicitList.length > 0) return appendAcceptanceTests(explicitList);

  const labeled = extractLabeledAcceptanceCriteria(lines);
  if (labeled.length > 0) return appendAcceptanceTests(labeled);
  const list = extractListSections(lines, ACCEPTANCE_SECTION, "acceptance-section");
  if (list.length > 0) return appendAcceptanceTests(list);
  return acceptanceTests;
}

function extractChangeSections(lines: string[]): Requirement[] {
  return extractListSections(lines, CHANGE_SECTION, "issue-list");
}

function extractNonBoilerplateChecklist(lines: string[]): Requirement[] {
  let excludedSection: MarkdownHeading | null = null;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      if (excludedSection && (closesSection(excludedSection, heading) || heading.kind === "bold" || heading.kind === "plain")) {
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
      if (section && (closesSection(section, heading) || section.kind === "bold" || section.kind === "plain")) {
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

    if (/^>|^<!--/.test(trimmed)) continue;
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
      if (excludedSection && (closesSection(excludedSection, heading) || heading.kind === "bold" || heading.kind === "plain")) {
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

export function extractExplicitRequirements(markdown: string): Requirement[] {
  const lines = stripFencedCode(markdown.split(/\r?\n/));
  return withIds(extractAcceptanceSections(lines));
}

export function extractRequirements(markdown: string): Requirement[] {
  const lines = stripFencedCode(markdown.split(/\r?\n/));

  const acceptance = extractAcceptanceSections(lines);
  if (acceptance.length > 0) return withIds(acceptance);

  const expected = extractExpectedBehavior(lines);
  if (expected.length > 0) return withIds(expected);

  const change = extractChangeSections(lines);
  if (change.length > 0) return withIds(change);

  const checklist = extractNonBoilerplateChecklist(lines);
  if (checklist.length > 0) return withIds(checklist);

  return withIds(extractFallbackLists(lines));
}
