import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ConstructionTerm, ConstructionImpact } from "../../models";

function assessTermImpact(
  term: ConstructionTerm,
  hasAccusedProduct: boolean,
  isDisputedByUser: boolean
): ConstructionImpact {
  if (isDisputedByUser || term.ambiguity_type === "disputed_by_user") {
    return "likely_affects";
  }

  if (
    term.ambiguity_type === "functional_term" &&
    hasAccusedProduct
  ) {
    return "likely_affects";
  }

  if (
    term.ambiguity_type === "vague_relational" ||
    term.ambiguity_type === "specification_dependent"
  ) {
    return "may_affect";
  }

  if (term.ambiguity_type === "contextual_term") {
    return hasAccusedProduct ? "may_affect" : "unlikely_to_affect";
  }

  return "may_affect";
}

export const downstreamImpactRule: Rule = {
  id: "cc_downstream_impact",
  name: "Downstream Impact Assessment",
  description:
    "Assesses whether each construction issue is likely to affect downstream " +
    "direct infringement analysis, and determines overall construction sensitivity.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const constructionTerms = (context.cc_construction_terms ?? []) as ConstructionTerm[];
    const claims = input.claims;

    const hasAccusedProduct = !!claims?.accused_product_description?.trim();
    const isConstructionDisputed = !!claims?.claim_construction_disputed;

    if (constructionTerms.length === 0) {
      context.cc_affects_di = false;
      context.cc_recommended_mode = "standard_matching";
      return {
        passed: true,
        effect: "no_downstream_impact",
        reasoning:
          "No construction terms to assess. " +
          "Direct infringement analysis can proceed with standard matching.",
      };
    }

    for (const term of constructionTerms) {
      const disputedByUser =
        isConstructionDisputed &&
        term.ambiguity_type === "disputed_by_user";
      term.downstream_impact = assessTermImpact(
        term,
        hasAccusedProduct,
        disputedByUser
      );
    }

    const likelyAffects = constructionTerms.filter(
      (t) => t.downstream_impact === "likely_affects"
    );
    const mayAffect = constructionTerms.filter(
      (t) => t.downstream_impact === "may_affect"
    );

    const affectsDI = likelyAffects.length > 0 || mayAffect.length > 0;
    const recommendedMode = affectsDI
      ? "construction_sensitive_matching"
      : "standard_matching";

    context.cc_affects_di = affectsDI;
    context.cc_recommended_mode = recommendedMode;
    context.cc_construction_terms = constructionTerms;

    if (likelyAffects.length > 0) {
      const termNames = likelyAffects.map((t) => `"${t.term}"`).join(", ");
      return {
        passed: false,
        effect: "likely_affects_di",
        reasoning:
          `${likelyAffects.length} term(s) are likely to affect direct infringement analysis: ${termNames}. ` +
          `${mayAffect.length} additional term(s) may also affect results. ` +
          "Construction-sensitive matching is recommended.",
        triggered_rule: "downstream_impact_likely",
      };
    }

    if (mayAffect.length > 0) {
      return {
        passed: "uncertain",
        effect: "may_affect_di",
        reasoning:
          `${mayAffect.length} term(s) may affect direct infringement analysis. ` +
          "The impact depends on which interpretation is adopted. " +
          "Construction-sensitive matching is recommended as a precaution.",
        triggered_rule: "downstream_impact_possible",
      };
    }

    return {
      passed: true,
      effect: "unlikely_to_affect_di",
      reasoning:
        "Identified terms are unlikely to materially affect the current direct infringement analysis. " +
        "Standard matching may proceed.",
    };
  },
};
