import type { Requirement } from "./types.js";

const ACCEPTANCE_HEADING = /^(#{1,6})\s+(acceptance criteria|requirements?|definition of done|success criteria|criteria)\s*$/i;
const HEADING = /^(#{1,6})\s+/;
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

export function extractRequirements(markdown: string): Requirement[] {
  const lines = markdown.split(/\r?\n/);
  const checklist: Requirement[] = [];

  for (const line of lines) {
    const match = line.match(CHECKBOX);
    if (!match) continue;
    checklist.push({
      id: `REQ-${checklist.length + 1}`,
      text: normalizeText(match[2] ?? ""),
      source: "issue-checklist",
      checked: (match[1] ?? "").toLowerCase() === "x"
    });
  }

  let inAcceptanceSection = false;
  let acceptanceLevel = 7;
  const sectionItems: Requirement[] = [];

  for (const line of lines) {
    const acceptance = line.match(ACCEPTANCE_HEADING);
    if (acceptance) {
      inAcceptanceSection = true;
      acceptanceLevel = acceptance[1]?.length ?? 7;
      continue;
    }

    const heading = line.match(HEADING);
    if (inAcceptanceSection && heading && (heading[1]?.length ?? 7) <= acceptanceLevel) {
      inAcceptanceSection = false;
    }

    if (!inAcceptanceSection) continue;

    const item = line.match(LIST_ITEM);
    if (!item) continue;
    const text = normalizeText((item[1] ?? "").replace(/^\[[ xX]\]\s*/, ""));
    if (!text) continue;

    sectionItems.push({
      id: `REQ-${sectionItems.length + 1}`,
      text,
      source: "acceptance-section"
    });
  }

  const combined = dedupe([...checklist, ...sectionItems]);
  if (combined.length > 0) {
    return combined.map((requirement, index) => ({ ...requirement, id: `REQ-${index + 1}` }));
  }

  const fallback: Requirement[] = [];
  for (const line of lines) {
    const item = line.match(LIST_ITEM);
    if (!item) continue;
    const text = normalizeText(item[1] ?? "");
    if (text.length < 8) continue;
    fallback.push({ id: `REQ-${fallback.length + 1}`, text, source: "issue-list" });
  }

  return dedupe(fallback).map((requirement, index) => ({ ...requirement, id: `REQ-${index + 1}` }));
}
