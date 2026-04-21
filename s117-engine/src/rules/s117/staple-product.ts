import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { S117EvaluationRequest } from "../../models";

export const stapleProductRule: Rule = {
  id: "staple_product_test",
  name: "Staple Commercial Product Gatekeeper",
  description:
    "Determines whether the product is a staple commercial product. " +
    "Per Hood v Down Under Enterprises, a staple product significantly " +
    "weakens the s117 infringement pathway.",
  evaluate(context: RuleContext): RuleResult {
    const req = context.request as S117EvaluationRequest;
    const staple = req.product.is_staple_commercial_product;
    const nonInfringing = req.product.has_non_infringing_uses;

    if (staple === "true") {
      return {
        passed: true,
        effect: "gatekeeper_triggered",
        reasoning:
          "The product is characterised as a staple commercial product. " +
          "Under s117 analysis (see Hood v Down Under Enterprises), " +
          "this significantly weakens the infringement pathway. " +
          "The supplier would generally not be liable unless a separate " +
          "instructions/inducement pathway is established.",
        triggered_rule:
          "IF product = staple commercial product THEN s117 pathway weakens significantly — gatekeeper activated",
      };
    }

    if (staple === "uncertain") {
      const leanStaple = nonInfringing === "true";
      return {
        passed: "uncertain",
        effect: leanStaple
          ? "gatekeeper_leaning_triggered"
          : "gatekeeper_uncertain",
        reasoning: leanStaple
          ? "Staple status is uncertain, but the product has clear non-infringing uses, " +
            "which leans toward staple characterisation."
          : "Staple status is uncertain. Further factual analysis is needed to determine " +
            "whether this product would be classified as a staple commercial product.",
        triggered_rule:
          "IF staple status uncertain THEN proceed with caution — result confidence reduced",
      };
    }

    // staple === "false"
    return {
      passed: false,
      effect: "gatekeeper_not_triggered",
      reasoning:
        "The product is not a staple commercial product. " +
        "The s117 gatekeeper does not apply — analysis proceeds to " +
        "supplier knowledge and conduct assessment.",
    };
  },
};
