import type { EvidenceStatus, VerificationReport } from "./types.js";

export type RequirementTrend = "ADDED" | "REMOVED" | "IMPROVED" | "REGRESSED" | "UNCHANGED";

export interface RequirementComparison {
  requirementId: string;
  text: string;
  before: EvidenceStatus | null;
  after: EvidenceStatus | null;
  trend: RequirementTrend;
}

export interface VerificationComparison {
  beforeVerdict: VerificationReport["verdict"];
  afterVerdict: VerificationReport["verdict"];
  requirements: RequirementComparison[];
  regressions: number;
  improvements: number;
  added: number;
  removed: number;
}

const STATUS_RANK: Record<EvidenceStatus, number> = {
  FAILED: 0,
  UNPROVEN: 1,
  PROVEN: 2
};

export function compareVerificationReports(
  before: VerificationReport,
  after: VerificationReport
): VerificationComparison {
  const beforeById = new Map(before.results.map((result) => [result.requirement.id, result]));
  const afterById = new Map(after.results.map((result) => [result.requirement.id, result]));
  const requirementIds = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();

  const requirements = requirementIds.map((requirementId): RequirementComparison => {
    const previous = beforeById.get(requirementId);
    const current = afterById.get(requirementId);
    const beforeStatus = previous?.status ?? null;
    const afterStatus = current?.status ?? null;

    let trend: RequirementTrend;
    if (!previous) {
      trend = "ADDED";
    } else if (!current) {
      trend = "REMOVED";
    } else if (beforeStatus === afterStatus) {
      trend = "UNCHANGED";
    } else if (STATUS_RANK[current.status] > STATUS_RANK[previous.status]) {
      trend = "IMPROVED";
    } else {
      trend = "REGRESSED";
    }

    return {
      requirementId,
      text: current?.requirement.text ?? previous?.requirement.text ?? requirementId,
      before: beforeStatus,
      after: afterStatus,
      trend
    };
  });

  return {
    beforeVerdict: before.verdict,
    afterVerdict: after.verdict,
    requirements,
    regressions: requirements.filter((item) => item.trend === "REGRESSED").length,
    improvements: requirements.filter((item) => item.trend === "IMPROVED").length,
    added: requirements.filter((item) => item.trend === "ADDED").length,
    removed: requirements.filter((item) => item.trend === "REMOVED").length
  };
}
