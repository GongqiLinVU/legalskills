import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, InputQualityReport } from "../../models";

export const diInputQualityRule: Rule = {
  id: "di_input_quality_check",
  name: "Direct Infringement Input Quality Check",
  description:
    "Validates whether sufficient claim and accused product information is present for element-by-element comparison.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const missing: string[] = [];
    const uncertain: string[] = [];

    const claims = input.claims;
    const hasClaimText = !!claims?.claim_text?.trim();
    const hasStructuredElements = (claims?.structured_elements?.length ?? 0) > 0;
    const hasStringElements = (claims?.claim_elements?.length ?? 0) > 0;
    const hasAccusedProduct = !!claims?.accused_product_description?.trim();
    const hasElementMapping = claims?.element_mapping_facts
      ? Object.keys(claims.element_mapping_facts).length > 0
      : false;

    if (!hasClaimText && !hasStructuredElements && !hasStringElements) {
      missing.push("claim_description_or_elements");
    }
    if (!hasAccusedProduct) {
      missing.push("accused_product_description");
    }
    if (!hasElementMapping) {
      uncertain.push("element_mapping_facts");
    }
    if (claims?.disputed_element_notes?.trim()) {
      uncertain.push("disputed_element_notes_present");
    }

    const quality: InputQualityReport = {
      complete: missing.length === 0,
      missing_fields: missing,
      uncertain_fields: uncertain,
    };

    context.di_input_quality = quality;

    if (missing.length >= 2) {
      return {
        passed: false,
        effect: "insufficient_input",
        reasoning:
          "Both claim description/elements and accused product description are missing. " +
          "Cannot perform element-by-element comparison.",
      };
    }

    if (missing.length === 1) {
      return {
        passed: "uncertain",
        effect: "partial_input",
        reasoning: `Missing: ${missing.join(", ")}. Analysis will proceed with reduced confidence.`,
      };
    }

    return {
      passed: true,
      effect: "input_sufficient",
      reasoning:
        "Claim information and accused product description are present. " +
        (hasElementMapping
          ? "Element mapping facts provided for detailed comparison."
          : "No explicit element mapping — matching will rely on textual comparison."),
    };
  },
};
