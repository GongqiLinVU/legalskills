import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { S117EvaluationRequest } from "../../models";

export const supplierKnowledgeRule: Rule = {
  id: "supplier_knowledge_test",
  name: "Supplier Mental State / Reason to Believe",
  description:
    "Evaluates whether the supplier had reason to believe the product " +
    "would be used in a way that infringes the patent.",
  evaluate(context: RuleContext): RuleResult {
    const req = context.request as S117EvaluationRequest;
    const rtb = req.supplier_conduct.has_reason_to_believe;
    const evidence = req.evidence_flags;

    if (rtb === "true") {
      const supportingEvidence: string[] = [];
      if (evidence.has_documentary_evidence)
        supportingEvidence.push("documentary evidence");
      if (evidence.has_customer_testimony)
        supportingEvidence.push("customer testimony");

      return {
        passed: true,
        effect: "supplier_knowledge_established",
        reasoning:
          "The supplier had reason to believe the product would be used " +
          "in an infringing manner." +
          (supportingEvidence.length > 0
            ? ` Supporting evidence includes: ${supportingEvidence.join(", ")}.`
            : ""),
        triggered_rule:
          "IF supplier has reason to believe product will be used to infringe THEN knowledge element satisfied",
      };
    }

    if (rtb === "uncertain") {
      return {
        passed: "uncertain",
        effect: "supplier_knowledge_unclear",
        reasoning:
          "It is unclear whether the supplier had reason to believe the product " +
          "would be used in an infringing manner. This is a factual question " +
          "that may require further evidence.",
        triggered_rule:
          "IF supplier knowledge uncertain THEN element inconclusive — confidence reduced",
      };
    }

    return {
      passed: false,
      effect: "supplier_knowledge_not_established",
      reasoning:
        "There is no indication the supplier had reason to believe " +
        "the product would be used to infringe the patent.",
    };
  },
};
