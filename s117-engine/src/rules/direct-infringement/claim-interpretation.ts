import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ElementMatchResult } from "../../models";

export const claimInterpretationRule: Rule = {
  id: "di_claim_interpretation_sensitivity",
  name: "Claim Interpretation Sensitivity Check",
  description:
    "Detects whether matching uncertainty is caused by unclear claim wording, " +
    "and recommends claim construction skill if so.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const results = context.di_element_results as ElementMatchResult[];
    const claims = input.claims;

    const hasDisputedNotes = !!claims?.disputed_element_notes?.trim();
    const isConstructionDisputed = !!claims?.claim_construction_disputed;
    const uncertainElements = (results ?? []).filter(
      (r) => r.match_result === "uncertain"
    );

    const uncertainFromDispute = uncertainElements.filter((r) =>
      r.reasoning.toLowerCase().includes("disputed") ||
      r.reasoning.toLowerCase().includes("claim construction")
    );

    const needsConstruction =
      isConstructionDisputed ||
      (hasDisputedNotes && uncertainElements.length > 0) ||
      uncertainFromDispute.length > 0;

    context.di_needs_claim_construction = needsConstruction;

    if (needsConstruction) {
      const reasons: string[] = [];
      if (isConstructionDisputed) reasons.push("claim construction flagged as disputed");
      if (hasDisputedNotes) reasons.push("disputed element notes present");
      if (uncertainFromDispute.length > 0)
        reasons.push(`${uncertainFromDispute.length} element(s) uncertain due to claim wording`);

      return {
        passed: "uncertain",
        effect: "claim_construction_recommended",
        reasoning:
          `Claim interpretation uncertainty detected (${reasons.join("; ")}). ` +
          "Recommend claim construction skill before relying on element matching results.",
        triggered_rule: "claim_interpretation_sensitivity",
      };
    }

    return {
      passed: true,
      effect: "no_interpretation_concern",
      reasoning:
        "No significant claim interpretation issues detected. " +
        "Matching results are not flagged as wording-dependent.",
    };
  },
};
