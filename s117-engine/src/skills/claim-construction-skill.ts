import { Skill, AgentInput, SkillOutput } from "../models";
import { evaluateClaimConstruction } from "../services/claim-construction-evaluator";

export const claimConstructionSkill: Skill = {
  name: "claim_construction_skill",
  description:
    "Identifies claim terms that may be ambiguous, functional, or interpretation-sensitive. " +
    "Produces candidate interpretations and assesses downstream impact on infringement analysis. " +
    "Deterministic heuristic — no LLM required.",
  handledIssues: ["claim_construction"],

  canHandle(input: AgentInput): boolean {
    const claims = input.claims;
    if (!claims) return false;

    const hasClaimInfo =
      !!claims.claim_text?.trim() ||
      (claims.claim_elements?.length ?? 0) > 0 ||
      (claims.structured_elements?.length ?? 0) > 0;

    const hasDispute =
      !!claims.claim_construction_disputed ||
      !!claims.disputed_element_notes?.trim();

    return hasClaimInfo && hasDispute;
  },

  evaluate(input: AgentInput): SkillOutput {
    if (!input.claims) {
      return {
        skill: "claim_construction_skill",
        status: "insufficient_information",
        confidence: "low",
        decision_path: [
          {
            step: "cc_input_check",
            result: false,
            effect: "no_claims_data",
            reasoning: "No claims data provided. Cannot perform claim construction analysis.",
          },
        ],
        explanation:
          "The claim construction skill could not execute because no claims data was provided.",
        warnings: ["Claim construction analysis skipped — no claims data."],
        suggested_next_skills: [],
      };
    }

    const result = evaluateClaimConstruction(input);

    const statusMap = {
      interpretation_sensitive: "possible_infringement" as const,
      no_construction_issue: "no_issue_detected" as const,
      insufficient_information: "insufficient_information" as const,
    };

    const suggestedSkills: string[] = [];
    if (result.downstream_effect.affects_direct_infringement) {
      suggestedSkills.push("direct_infringement_skill");
    }

    return {
      skill: "claim_construction_skill",
      status: statusMap[result.result],
      confidence: result.confidence,
      decision_path: result.decision_path,
      explanation: result.explanation,
      warnings: result.warnings,
      suggested_next_skills: suggestedSkills,
      raw_result: result,
    };
  },
};
