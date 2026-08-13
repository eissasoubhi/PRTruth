import type { Requirement } from './types.js';

const requirementSection = /^(acceptance criteria|requirements?|definition of done|expected behavio(u)?r|scope)\s*:?$/i;
const taskItem = /^\s*[-*+]\s+\[[ xX]\]\s+(.+?)\s*$/;
const bulletItem = /^\s*[-*+]\s+(?:\[[ xX]\]\s*)?(.+?)\s*$/;
const claimWords = /(pass(?:es|ed)?|implement(?:ed|s)?|add(?:ed|s)?|fix(?:ed|es)?|support(?:ed|s)?|compatib|breaking|tests?|lint|type.?check|build|complete(?:d)?|done)/i;

function clean(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractRequirements(body: string | null | undefined, title: string): Requirement[] {
  const lines = (body ?? '').split(/\r?\n/);
  const found: Array<Omit<Requirement, 'id'>> = [];

  for (const line of lines) {
    const match = line.match(taskItem);
    if (match?.[1]) {
      found.push({ text: clean(match[1]), source: 'issue-task' });
    }
  }

  let inRequirementSection = false;
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading?.[1]) {
      inRequirementSection = requirementSection.test(clean(heading[1]));
      continue;
    }

    if (!inRequirementSection) continue;
    const match = line.match(bulletItem);
    if (match?.[1]) {
      found.push({ text: clean(match[1]), source: 'issue-section' });
    }
  }

  const seen = new Set<string>();
  const unique = found.filter((item) => {
    const key = item.text.toLowerCase();
    if (!item.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    unique.push({ text: clean(title), source: 'issue-title' });
  }

  return unique.map((item, index) => ({ id: `R${index + 1}`, ...item }));
}

export function extractClaims(body: string | null | undefined): string[] {
  if (!body) return [];

  const candidates: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const bullet = line.match(bulletItem);
    if (bullet?.[1] && claimWords.test(bullet[1])) candidates.push(clean(bullet[1]));
  }

  const prose = body.replace(/\r?\n/g, ' ');
  for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
    const normalized = clean(sentence.replace(/^#+\s*/, ''));
    if (normalized.length >= 12 && normalized.length <= 240 && claimWords.test(normalized)) {
      candidates.push(normalized);
    }
  }

  return [...new Set(candidates)];
}
