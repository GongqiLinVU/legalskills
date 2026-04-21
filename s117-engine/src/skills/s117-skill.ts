import { Skill, AgentInput, S117EvaluationRequest, SkillOutput } from "../models";
import { evaluateS117 } from "../services/s117-evaluator";

function extractS117Request(input: AgentInput): S117EvaluationRequest | null {
  if (!input.product?.product_name) {
    return null;
  }
  if (!input.supplier_conduct) {
    return null;
  }

  return {
    patent_context: input.patent_context ?? {},
    product: {
      product_name: input.product.product_name,
      product_description: input.product.product_description,
      is_staple_commercial_product: input.product.is_staple_commercial_product ?? "uncertain",
      staple_reasoning: input.product.staple_reasoning,
      has_non_infringing_uses: input.product.has_non_infringing_uses ?? "uncertain",
    },
    supplier_conduct: {
      has_reason_to_believe: input.supplier_conduct.has_reason_to_believe ?? "uncertain",
      reason_to_believe_details: input.supplier_conduct.reason_to_believe_details,
      provided_instructions_for_infringing_use:
        input.supplier_conduct.provided_instructions_for_infringing_use ?? "uncertain",
      instructions_details: input.supplier_conduct.instructions_details,
      induced_or_advertised_infringing_use:
        input.supplier_conduct.induced_or_advertised_infringing_use ?? "uncertain",
      inducement_details: input.supplier_conduct.inducement_details,
    },
    evidence_flags: {
      has_expert_evidence: input.evidence?.has_expert_evidence ?? false,
      has_documentary_evidence: input.evidence?.has_documentary_evidence ?? false,
      has_advertising_evidence: input.evidence?.has_advertising_evidence ?? false,
      has_customer_testimony: input.evidence?.has_customer_testimony ?? false,
      evidence_notes: input.evidence?.evidence_notes,
    },
  };
}

export const s117Skill: Skill = {
  name: "s117_skill",
  description:
    "Evaluates indirect patent infringement under s117 of the Patents Act 1990 (Cth). " +
    "Wraps the existing s117 rule engine behind the common skill interface.",
  handledIssues: ["s117_indirect_infringement"],

  canHandle(input: AgentInput): boolean {
    return !!input.product?.product_name && !!input.supplier_conduct;
  },

  evaluate(input: AgentInput): SkillOutput {
    const request = extractS117Request(input);

    if (!request) {
      return {
        skill: "s117_skill",
        status: "insufficient_information",
        confidence: "low",
        decision_path: [
          {
            step: "s117_input_extraction",
            result: false,
            effect: "extraction_failed",
            reasoning:
              "Could not extract sufficient s117 input. " +
              "Requires at minimum: product.product_name and supplier_conduct.",
          },
        ],
        explanation:
          "The s117 skill could not execute because required input fields are missing. " +
          "Please provide product information and supplier conduct details.",
        warnings: [
          "s117 evaluation skipped due to missing input. " +
          "Required: product.product_name, supplier_conduct.",
        ],
        suggested_next_skills: [],
      };
    }

    const result = evaluateS117(request);

    return {
      skill: "s117_skill",
      status: result.likely_result,
      confidence: result.confidence,
      decision_path: result.decision_path,
      explanation: result.explanation,
      warnings: result.warnings,
      suggested_next_skills: [],
      raw_result: result,
    };
  },
};
