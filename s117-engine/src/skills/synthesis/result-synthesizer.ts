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
      `The construction of ${sensitiveTerms.length} claim term(s) is in dispute: ${sensitiveTerms.join(", ")}.`
    );
  }

  if (di.divergence.is_divergent) {
    parts.push(
      `The outcome turns on how these terms are construed. ` +
      `Under the broader construction, the assessment is ${di.outcome_profile.broad_view.replace(/_/g, " ")}. ` +
      `Under the narrower construction, the assessment is ${di.outcome_profile.narrow_view.replace(/_/g, " ")}.`
    );
    if (di.divergence.divergent_elements.length > 0) {
      parts.push(
        `${di.divergence.divergent_elements.length} claim integer(s) are affected by the choice of construction.`
      );
    }
  } else {
    parts.push(
      `The assessment is stable regardless of which construction is adopted: ${di.outcome_profile.broad_view.replace(/_/g, " ")}.`
    );
  }

  return parts.join(" ");
}

const ISSUE_DESCRIPTIONS: Record<string, string> = {
  direct_infringement: "whether the accused product directly infringes the patent claims",
  claim_construction: "whether the meaning of certain claim terms is disputed and may affect the outcome",
  s117_indirect_infringement: "whether the supplier may be liable for indirect infringement under s117 of the Patents Act 1990",
};

function buildExplanation(
  detectedIssues: LegalIssue[],
  skillResults: SkillOutput[],
  overallStatus: SkillStatus
): string {
  const parts: string[] = [];

  const issueDescriptions = detectedIssues
    .map((issue, i) => `(${i + 1}) ${ISSUE_DESCRIPTIONS[issue] ?? issue}`)
    .join("; ");

  parts.push(
    detectedIssues.length === 1
      ? `One legal question arises from this fact pattern: ${issueDescriptions}.`
      : `${detectedIssues.length} legal questions arise from this fact pattern: ${issueDescriptions}.`
  );

  const substantive = skillResults.filter(
    (r) => r.skill !== "issue_classifier_skill"
  );

  if (substantive.length > 0) {
    for (const r of substantive) {
      parts.push(r.explanation);
    }
  } else {
    parts.push(
      "The information provided was not sufficient to perform substantive analysis on the identified issues."
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
    "This analysis is preliminary and based on the information provided. It does not constitute legal advice and should not be relied upon in place of formal legal opinion.",
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
    const unhandledDescriptions = unhandled
      .map((issue) => ISSUE_DESCRIPTIONS[issue] ?? issue)
      .join("; ");
    warnings.push(
      `The following issues were identified but could not be analysed with the available tools: ${unhandledDescriptions}.`
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
