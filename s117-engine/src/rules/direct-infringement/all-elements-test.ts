import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { ElementMatchResult } from "../../models";

export const allElementsRule: Rule = {
  id: "di_all_elements_test",
  name: "All-Elements Determination",
  description:
    "Applies the all-elements rule: if any essential element is not matched, " +
    "direct infringement is unlikely. If all are matched, it is likely.",

  evaluate(context: RuleContext): RuleResult {
    const results = context.di_element_results as ElementMatchResult[];

    if (!results || results.length === 0) {
      return {
        passed: "uncertain",
        effect: "no_element_data",
        reasoning: "No element matching results available. Cannot apply all-elements rule.",
      };
    }

    const essential = results.filter((r) => r.essential);
    const essentialNotMatched = essential.filter(
      (r) => r.match_result === "not_matched"
    );
    const essentialUncertain = essential.filter(
      (r) => r.match_result === "uncertain"
    );
    const essentialMatched = essential.filter(
      (r) => r.match_result === "matched"
    );

    if (essentialNotMatched.length > 0) {
      const missingIds = essentialNotMatched.map((r) => r.element_id).join(", ");
      return {
        passed: false,
        effect: "essential_element_missing",
        reasoning:
          `${essentialNotMatched.length} essential element(s) not matched (${missingIds}). ` +
          "Under the all-elements rule, direct infringement requires every essential element. " +
          "Missing even one means infringement is unlikely.",
        triggered_rule: "all_elements_rule",
      };
    }

    if (essentialUncertain.length > 0 && essentialMatched.length === 0) {
      return {
        passed: "uncertain",
        effect: "all_elements_uncertain",
        reasoning:
          `All ${essential.length} essential elements are uncertain. ` +
          "Insufficient information to determine infringement.",
      };
    }

    if (essentialUncertain.length > 0) {
      const uncertainIds = essentialUncertain.map((r) => r.element_id).join(", ");
      return {
        passed: "uncertain",
        effect: "some_elements_uncertain",
        reasoning:
          `${essentialMatched.length} element(s) matched but ${essentialUncertain.length} remain uncertain (${uncertainIds}). ` +
          "Infringement is possible but cannot be confirmed without resolving these elements.",
      };
    }

    return {
      passed: true,
      effect: "all_elements_matched",
      reasoning:
        `All ${essential.length} essential claim element(s) appear matched in the accused product. ` +
        "Under the all-elements rule, this supports a finding of direct infringement.",
      triggered_rule: "all_elements_rule",
    };
  },
};
