import type { Evidence } from "./types.js";

export const PACKAGED_RUNTIME_UNPROVEN_REASON =
  "Packaged or installed runtime behavior requires observable package/installer execution evidence, not dependency installation or build checks alone.";

interface ArtifactEvidenceRequirement {
  claim: RegExp;
  evidence: RegExp;
}

const ARTIFACT_REQUIREMENTS: ArtifactEvidenceRequirement[] = [
  { claim: /\bnsis\b/i, evidence: /\bnsis\b/i },
  { claim: /\bwin[- ]unpacked\b/i, evidence: /\bwin[- ]unpacked\b/i },
  { claim: /\bmsi\b/i, evidence: /\bmsi\b/i },
  { claim: /\bdmg\b/i, evidence: /\bdmg\b/i },
  { claim: /\bappimage\b/i, evidence: /\bappimage\b/i },
  { claim: /\b(?:deb|rpm)\s+package\b/i, evidence: /\b(?:deb|rpm)\b/i }
];

const EXECUTION_LANGUAGE =
  /\b(?:install(?:ed|ation)?|launch(?:ed)?|run|runtime|smoke|scenario|e2e|end[- ]to[- ]end|test(?:ed|s)?)\b/i;

function genericInstalledArtifactClaim(text: string): boolean {
  return /\b(?:installed|packaged)\s+(?:app|application|build|package|binary|runtime)\b/i.test(text)
    || /\binstaller\b/i.test(text);
}

export function requiresPackagedRuntimeExecutionEvidence(text: string): boolean {
  return ARTIFACT_REQUIREMENTS.some((requirement) => requirement.claim.test(text))
    || genericInstalledArtifactClaim(text);
}

export function hasPackagedRuntimeExecutionEvidence(
  text: string,
  evidence: Evidence[]
): boolean {
  const requiredArtifacts = ARTIFACT_REQUIREMENTS.filter((requirement) =>
    requirement.claim.test(text)
  );

  if (requiredArtifacts.length > 0) {
    return requiredArtifacts.every((requirement) =>
      evidence.some((item) =>
        requirement.evidence.test(item.summary) && EXECUTION_LANGUAGE.test(item.summary)
      )
    );
  }

  if (!genericInstalledArtifactClaim(text)) return true;

  return evidence.some((item) =>
    /\b(?:installer|installed|packaged)\b/i.test(item.summary)
      && EXECUTION_LANGUAGE.test(item.summary)
      && !/\b(?:install dependencies|dependencies|npm ci|pnpm install|composer install)\b/i.test(item.summary)
  );
}
