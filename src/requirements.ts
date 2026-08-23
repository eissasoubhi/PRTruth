import type { Requirement } from "./types.js";

const ACCEPTANCE_HEADING = /^(#{1,6})\s+(acceptance criteria|requirements?|definition of done|success criteria|criteria)\s*#*\s*$/i;
const EXPECTED_HEADING = /^(#{1,6})\s+(expected behavior|desired behavior|expected result|desired result)\s*#*\s*$/i;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;
const EXCLUDED_SECTION = /^(?:contributor checklist|checklist|out of scope|to reproduce|steps? to reproduce|reproduction(?: steps?)?|how (?:has this been )?tested|testing instructions?|references?|technical notes?|screenshots?|additional notes?)$/i;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeading(value: string): string {
  return normalizeText(value).replace(/[:：]\s*$/, "");
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
  let inSection = false;
  let sectionLevel = 7;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const acceptance = line.match(ACCEPTANCE_HEADING);
    if (acceptance) {
      inSection = true;
      sectionLevel = acceptance[1]?.length ?? 7;
      continue;
    }

    const heading = line.match(HEADING);
    if (inSection && heading && (heading[1]?.length ?? 7) <= sectionLevel) {
      inSection = false;
    }

    if (!inSection) continue;
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
  let excluded = false;
  let excludedLevel = 7;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1]?.length ?? 7;
      if (excluded && level <= excludedLevel) excluded = false;

      const headingName = normalizeHeading(heading[2] ?? "");
      if (EXCLUDED_SECTION.test(headingName)) {
        excluded = true;
        excludedLevel = level;
      }
      continue;
    }

    if (excluded) continue;
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
  let inSection = false;
  let sectionLevel = 7;
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
    const expected = line.match(EXPECTED_HEADING);
    if (expected) {
      flushParagraph();
      inSection = true;
      sectionLevel = expected[1]?.length ?? 7;
      continue;
    }

    const heading = line.match(HEADING);
    if (inSection && heading && (heading[1]?.length ?? 7) <= sectionLevel) {
      flushParagraph();
      inSection = false;
    }

    if (!inSection) continue;

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
  let excluded = false;
  let excludedLevel = 7;
  const requirements: Requirement[] = [];

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1]?.length ?? 7;
      if (excluded && level <= excludedLevel) excluded = false;

      const headingName = normalizeHeading(heading[2] ?? "");
      if (EXCLUDED_SECTION.test(headingName)) {
        excluded = true;
        excludedLevel = level;
      }
      continue;
    }

    if (excluded) continue;
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
