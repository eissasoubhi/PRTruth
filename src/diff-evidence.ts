import type { Evidence } from "./types.js";

export interface PatchFile {
  filename: string;
  patch?: string;
}

interface PatchLine {
  filename: string;
  lineNumber: number;
  content: string;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "must", "should",
  "have", "has", "are", "was", "were", "will", "not", "all", "any", "can", "its", "their", "our",
  "a", "an", "to", "of", "in", "on", "by", "or", "as", "at", "be", "is", "it", "up", "both",
  "affected", "same", "within", "through", "instead", "between", "each", "full", "github", "hosted",
  "les", "des", "une", "dans", "avec", "pour", "que", "qui", "sur", "est", "être", "doit", "doivent"
]);

function canonicalToken(token: string): string {
  const lower = token.toLowerCase();

  if (/^retr(?:y|ies|ied|ying)$/.test(lower)) return "retry";
  if (/^install(?:s|ed|ing|ation|ations)?$/.test(lower)) return "install";
  if (/^dependenc(?:y|ies)$/.test(lower)) return "dependency";
  if (/^attempt(?:s|ed|ing)?$/.test(lower)) return "attempt";
  if (/^download(?:s|ed|ing)?$/.test(lower)) return "download";
  if (/^reus(?:e|es|ed|ing)$/.test(lower)) return "reuse";
  if (/^success(?:ful|fully)?$/.test(lower)) return "success";
  if (/^reduc(?:e|es|ed|ing|tion)$/.test(lower)) return "reduce";
  if (/^concurrenc(?:y|ies)$/.test(lower)) return "parallel";
  if (/^parallel(?:ism)?$/.test(lower)) return "parallel";
  if (/^times?$/.test(lower)) return "time";
  if (/^fail(?:s|ed|ure|ures|ing)?$/.test(lower)) return "fail";

  return lower;
}

function tokenize(text: string): Set<string> {
  const normalized = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_./:-]+/g, " ")
    .toLowerCase();

  return new Set(
    normalized
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map(canonicalToken)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
  );
}

function addedPatchLines(file: PatchFile): PatchLine[] {
  if (!file.patch) return [];

  const lines: PatchLine[] = [];
  let newLineNumber: number | null = null;

  for (const rawLine of file.patch.split("\n")) {
    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLineNumber = Number.parseInt(hunk[1]!, 10);
      continue;
    }

    if (newLineNumber === null) continue;

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lines.push({
        filename: file.filename,
        lineNumber: newLineNumber,
        content: rawLine.slice(1).trim()
      });
      newLineNumber += 1;
      continue;
    }

    if (rawLine.startsWith("-")) continue;
    newLineNumber += 1;
  }

  return lines;
}

function scoreLine(statementTerms: Set<string>, line: PatchLine): number {
  const lineTerms = tokenize(line.content);
  let matches = 0;
  for (const term of statementTerms) {
    if (lineTerms.has(term)) matches += 1;
  }
  return matches;
}

function compactLine(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 120 ? `${singleLine.slice(0, 117)}...` : singleLine;
}

export function findPatchCandidateEvidence(
  statement: string,
  files: PatchFile[],
  limit = 3
): Evidence[] {
  const statementTerms = tokenize(statement);
  if (statementTerms.size === 0 || limit <= 0) return [];

  const ranked = files
    .flatMap(addedPatchLines)
    .map((line) => ({ line, score: scoreLine(statementTerms, line) }))
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score || a.line.filename.localeCompare(b.line.filename) || a.line.lineNumber - b.line.lineNumber);

  const seen = new Set<string>();
  const evidence: Evidence[] = [];

  for (const { line } of ranked) {
    const key = `${line.filename}\u0000${line.lineNumber}\u0000${line.content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    evidence.push({
      kind: "diff",
      summary: `Patch candidate: ${line.filename}:${line.lineNumber} — ${compactLine(line.content)}`
    });

    if (evidence.length >= limit) break;
  }

  return evidence;
}
