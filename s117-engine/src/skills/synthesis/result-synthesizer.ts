import {
  AgentInput,
  AgentOutput,
  LegalIssue,
  SkillOutput,
  SkillStatus,
  Confidence,
  DecisionStep,
  ClaimConstructionResult,
  DirectInfringementResult,
} from "../../models";

const STATUS_SEVERITY: Record<SkillStatus, number> = {
  likely_infringement: 4,
  possible_infringement: 3,
  unlikely_infringement: 2,
  insufficient_information: 1,
  issue_detected: 0,
  no_issue_detected: 0,
  not_applicable: 0,
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function deriveOverallStatus(skillResults: SkillOutput[]): SkillStatus {
  const substantive = skillResults.filter(
    (r) => r.skill !== "issue_classifier_skill"
  );

  if (substantive.length === 0) {
    const classifier = skillResults.find(
      (r) => r.skill === "issue_classifier_skill"
    );
    return classifier?.status ?? "insufficient_information";
  }

  let worst: SkillStatus = "not_applicable";
  for (const r of substantive) {
    if (STATUS_SEVERITY[r.status] > STATUS_SEVERITY[worst]) {
      worst = r.status;
    }
  }
  return worst;
}

function deriveOverallConfidence(skillResults: SkillOutput[]): Confidence {
  const substantive = skillResults.filter(
    (r) => r.skill !== "issue_classifier_skill"
  );

  if (substantive.length === 0) {
    return "low";
  }

  let lowest: Confidence = "high";
  for (const r of substantive) {
    if (CONFIDENCE_RANK[r.confidence] < CONFIDENCE_RANK[lowest]) {
      lowest = r.confidence;
    }
  }
  return lowest;
}

function buildDecisionPath(skillResults: SkillOutput[]): DecisionStep[] {
  const path: DecisionStep[] = [];

  for (const result of skillResults) {
    path.push({
      step: `skill_${result.skill}`,
      result: result.status,
      effect: `${result.skill}_completed`,
      reasoning: result.explanation,
    });
  }

  return path;
}

function buildConstructionDrivenSynthesis(skillResults: SkillOutput[]): string | undefined {
  const ccResult = skillResults.find((r) => r.skill === "claim_construction_skill");
  const diResult = skillResults.find((r) => r.skill === "direct_infringement_skill");

  if (!ccResult?.raw_result || !diResult?.raw_result) return undefined;

  const cc = ccResult.raw_result as ClaimConstructionResult;
  const di = diResult.raw_result as DirectInfringementResult;

  if (!di.outcome_profile || !di.divergence) return undefined;

  const parts: string[] = [];

  const sensitiveTerms = cc.construction_terms
    .filter((t) => t.downstream_impact !== "unlikely_to_affect")
    .map((t) => `"${t.term}"`);

  if (sensitiveTerms.length > 0) {
    parts.push(
      `Claim construction identified ${sensitiveTerms.length} interpretation-sensitive term(s): ${sensitiveTerms.join(", ")}.`
    );
  }

  if (di.divergence.divergent_elements.length > 0) {
    parts.push(
      `${di.divergence.divergent_elements.length} element(s) changed outcome between broad and narrow modes: ${di.divergence.divergent_elements.join(", ")}.`
    );
  }

  if (di.divergence.is_divergent) {
    parts.push(
      `The infringement result is interpretation-sensitive. ` +
      `Under the broader reading of the disputed terms, the outcome is ${di.outcome_profile.broad_view.replace(/_/g, " ")}. ` +
      `Under the narrower reading, the outcome is ${di.outcome_profile.narrow_view.replace(/_/g, " ")}.`
    );
  } else {
    parts.push(
      `The liability assessment is stable across both interpretation modes: ${di.outcome_profile.broad_view.replace(/_/g, " ")}.`
    );
  }

  return parts.join(" ");
}

function buildExplanation(
  detectedIssues: LegalIssue[],
  skillResults: SkillOutput[],
  overallStatus: SkillStatus
): string {
  const parts: string[] = [];

  parts.push(
    `The agent identified ${detectedIssues.length} legal issue(s): ${detectedIssues.join(", ")}.`
  );

  const substantive = skillResults.filter(
    (r) => r.skill !== "issue_classifier_skill"
  );

  if (substantive.length > 0) {
    parts.push(
      `${substantive.length} skill(s) were executed to analyse these issues.`
    );
    for (const r of substantive) {
      parts.push(`[${r.skill}] ${r.explanation}`);
    }
  } else {
    parts.push(
      "No substantive analysis skills were executed — either no implemented skills match the detected issues, or input was insufficient."
    );
  }

  const synthesisParagraph = buildConstructionDrivenSynthesis(skillResults);
  if (synthesisParagraph) {
    parts.push(synthesisParagraph);
  }

  parts.push(`Overall assessment: ${overallStatus.replace(/_/g, " ")}.`);

  return parts.join(" ");
}

function collectWarnings(
  _input: AgentInput,
  skillResults: SkillOutput[],
  detectedIssues: LegalIssue[],
  selectedSkills: string[]
): string[] {
  const warnings: string[] = [
    "This is a prototype legal reasoning system, not legal advice.",
  ];

  const substantiveSkills = new Set(
    skillResults
      .filter((r) => r.skill !== "issue_classifier_skill" && r.status !== "not_applicable")
      .map((r) => r.skill)
  );

  const handledIssueMap: Record<string, string[]> = {
    s117_indirect_infringement: ["s117_skill"],
    direct_infringement: ["direct_infringement_skill"],
    claim_construction: ["claim_construction_skill"],
  };

  const unhandled = detectedIssues.filter((issue) => {
    if (issue === "unknown") return true;
    const relevantSkills = handledIssueMap[issue] ?? [];
    return !relevantSkills.some(
      (s) => selectedSkills.includes(s) && substantiveSkills.has(s)
    );
  });

  if (unhandled.length > 0) {
    warnings.push(
      `Detected issues without implemented skills: ${unhandled.join(", ")}. These could not be analysed.`
    );
  }

  for (const r of skillResults) {
    for (const w of r.warnings) {
      if (!warnings.includes(w)) {
        warnings.push(w);
      }
    }
  }

  return warnings;
}

function collectSuggestedNextSkills(skillResults: SkillOutput[]): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const r of skillResults) {
    for (const s of r.suggested_next_skills) {
      if (!seen.has(s)) {
        seen.add(s);
        suggestions.push(s);
      }
    }
  }

  return suggestions;
}

export function synthesize(
  input: AgentInput,
  detectedIssues: LegalIssue[],
  selectedSkills: string[],
  skillResults: SkillOutput[]
): AgentOutput {
  const overallStatus = deriveOverallStatus(skillResults);
  const overallConfidence = deriveOverallConfidence(skillResults);
  const decisionPath = buildDecisionPath(skillResults);
  const explanation = buildExplanation(detectedIssues, skillResults, overallStatus);
  const warnings = collectWarnings(input, skillResults, detectedIssues, selectedSkills);
  const suggestedNextSkills = collectSuggestedNextSkills(skillResults);

  return {
    module: "legal_decision_agent_v2",
    detected_issues: detectedIssues,
    selected_skills: selectedSkills,
    overall_result: {
      status: overallStatus,
      confidence: overallConfidence,
    },
    skill_results: skillResults,
    decision_path: decisionPath,
    explanation,
    warnings,
    suggested_next_skills: suggestedNextSkills,
  };
}
