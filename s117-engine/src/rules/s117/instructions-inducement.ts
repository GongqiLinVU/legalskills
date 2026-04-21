import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { S117EvaluationRequest } from "../../models";

export const instructionsInducementRule: Rule = {
  id: "instructions_or_inducement_test",
  name: "Instructions / Inducement / Advertisement",
  description:
    "Evaluates whether the supplier provided instructions for infringing use, " +
    "or induced/advertised the product for infringing purposes. " +
    "This pathway can override the staple product gatekeeper.",
  evaluate(context: RuleContext): RuleResult {
    const req = context.request as S117EvaluationRequest;
    const instructions =
      req.supplier_conduct.provided_instructions_for_infringing_use;
    const inducement =
      req.supplier_conduct.induced_or_advertised_infringing_use;
    const evidence = req.evidence_flags;

    const hasInstructions = instructions === "true";
    const hasInducement = inducement === "true";
    const hasAdvertisingEvidence = evidence.has_advertising_evidence;

    if (hasInstructions && hasInducement) {
      return {
        passed: true,
        effect: "strong_override",
        reasoning:
          "The supplier both provided instructions for infringing use AND " +
          "actively induced or advertised the product for infringing purposes. " +
          "This constitutes a strong override of the staple product gatekeeper — " +
          "even a staple product may give rise to s117 liability in these circumstances.",
        triggered_rule:
          "IF instructions AND inducement THEN strong override — s117 liability likely even for staple product",
      };
    }

    if (hasInstructions) {
      return {
        passed: true,
        effect: "moderate_override",
        reasoning:
          "The supplier provided instructions directing toward infringing use. " +
          "This may override the staple product gatekeeper, depending on " +
          "the specificity and clarity of those instructions.",
        triggered_rule:
          "IF instructions for infringing use provided THEN partial override of staple gatekeeper",
      };
    }

    if (hasInducement) {
      return {
        passed: true,
        effect: hasAdvertisingEvidence ? "strong_override" : "moderate_override",
        reasoning:
          "The supplier induced or advertised the product for infringing use." +
          (hasAdvertisingEvidence
            ? " This is supported by advertising evidence, strengthening the override."
            : " However, no specific advertising evidence has been identified."),
        triggered_rule:
          "IF inducement/advertisement toward infringing use THEN partial or strong override of staple gatekeeper",
      };
    }

    const hasUncertain =
      instructions === "uncertain" || inducement === "uncertain";
    if (hasUncertain) {
      return {
        passed: "uncertain",
        effect: "override_uncertain",
        reasoning:
          "The evidence regarding instructions or inducement is uncertain. " +
          "Further factual investigation is needed to determine whether " +
          "the supplier's conduct constitutes a sufficient override pathway.",
      };
    }

    return {
      passed: false,
      effect: "no_override",
      reasoning:
        "There is no evidence of instructions for infringing use or " +
        "inducement/advertisement toward infringing purposes. " +
        "The staple product gatekeeper (if triggered) is not overridden.",
    };
  },
};
