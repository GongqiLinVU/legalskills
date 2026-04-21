import { Skill, AgentInput, SkillOutput } from "../models";
import { evaluateDirectInfringement } from "../services/direct-infringement-evaluator";

export const directInfringementSkill: Skill = {
  name: "direct_infringement_skill",
  description:
    "Evaluates whether the accused product likely satisfies all required claim elements " +
    "using a structured all-elements approach. Returns element-by-element comparison results.",
  handledIssues: ["direct_infringement"],

  canHandle(input: AgentInput): boolean {
    const claims = input.claims;
    if (!claims) return false;

    const hasClaimInfo =
      !!claims.claim_text?.trim() ||
      (claims.claim_elements?.length ?? 0) > 0 ||
      (claims.structured_elements?.length ?? 0) > 0;
    const hasAccusedProduct = !!claims.accused_product_description?.trim();

    return hasClaimInfo && hasAccusedProduct;
  },

  evaluate(input: AgentInput): SkillOutput {
    if (!input.claims) {
      return {
        skill: "direct_infringement_skill",
        status: "insufficient_information",
        confidence: "low",
        decision_path: [
          {
            step: "di_input_check",
            result: false,
            effect: "no_claims_data",
            reasoning: "No claims data provided. Cannot perform direct infringement analysis.",
          },
        ],
        explanation:
          "The direct infringement skill could not execute because no claims data was provided. " +
          "Please provide claim text or elements and an accused product description.",
        warnings: ["Direct infringement analysis skipped — no claims data."],
        suggested_next_skills: [],
      };
    }

    const result = evaluateDirectInfringement(input);

    const suggestedSkills: string[] = [];
    if (result.claim_interpretation_warning) {
      suggestedSkills.push("claim_construction_skill");
    }

    return {
      skill: "direct_infringement_skill",
      status: result.likely_result,
      confidence: result.confidence,
      decision_path: result.decision_path,
      explanation: result.explanation,
      warnings: result.warnings,
      suggested_next_skills: suggestedSkills,
      raw_result: result,
    };
  },
};
