import { Rule, RuleContext, RuleResult } from "../rule-engine";
import {
  ClaimElement,
  MatchResult,
  DirectInfringementLikelihood,
  DirectInfringementOutcomeProfile,
  DivergenceAssessment,
  ElementModeMatchResult,
  ElementMatchResult,
} from "../../models";
import { ElementConstructionDependency } from "./construction-dependency-mapping";

function deriveOutcome(
  results: Array<{ element_id: string; match: MatchResult }>,
  elements: ClaimElement[]
): DirectInfringementLikelihood {
  const essential = elements.filter((e) => e.essential !== false);
  if (essential.length === 0) return "insufficient_information";

  const essentialResults = essential.map((e) => {
    const r = results.find((rr) => rr.element_id === e.id);
    return r?.match ?? "uncertain";
  });

  const notMatched = essentialResults.filter((r) => r === "not_matched").length;
  const uncertain = essentialResults.filter((r) => r === "uncertain").length;
  const matched = essentialResults.filter((r) => r === "matched").length;

  if (notMatched > 0) return "unlikely_infringement";
  if (matched === essentialResults.length) return "likely_infringement";
  if (uncertain > 0 && matched > 0) return "possible_infringement";
  if (uncertain === essentialResults.length) return "insufficient_information";
  return "possible_infringement";
}

export const divergenceSynthesisRule: Rule = {
  id: "di_divergence_synthesis",
  name: "Divergence Synthesis",
  description:
    "Compares broad-mode and narrow-mode matching results to determine whether " +
    "the overall infringement outcome is stable, divergent, or interpretation-sensitive.",

  evaluate(context: RuleContext): RuleResult {
    const elements = context.di_elements as ClaimElement[];
    const baselineResults = context.di_element_results as ElementMatchResult[];
    const broadResults = context.di_broad_results as
      | Array<{ element_id: string; match: MatchResult; reasoning: string }>
      | undefined;
    const narrowResults = context.di_narrow_results as
      | Array<{ element_id: string; match: MatchResult; reasoning: string }>
      | undefined;
    const deps = context.di_construction_deps as
      | ElementConstructionDependency[]
      | undefined;
    const hasMap = !!context.di_has_construction_map;

    if (!hasMap || !broadResults || !narrowResults || !deps) {
      context.di_outcome_profile = undefined;
      context.di_divergence = undefined;
      context.di_element_mode_results = undefined;
      return {
        passed: true,
        effect: "no_divergence_analysis",
        reasoning: "No construction-driven mode results available. Divergence synthesis skipped.",
      };
    }

    const elementModeResults: ElementModeMatchResult[] = [];
    const stableElements: string[] = [];
    const divergentElements: string[] = [];

    for (const baseline of baselineResults) {
      const broad = broadResults.find((r) => r.element_id === baseline.element_id);
      const narrow = narrowResults.find((r) => r.element_id === baseline.element_id);
      const dep = deps.find((d) => d.element_id === baseline.element_id);

      const broadMatch = broad?.match ?? baseline.match_result;
      const narrowMatch = narrow?.match ?? baseline.match_result;
      const isAffected = dep?.affected ?? false;
      const affectingTermNames = (dep?.affecting_terms ?? []).map((t) => t.term);

      const isDivergent = broadMatch !== narrowMatch;
      if (isDivergent) {
        divergentElements.push(baseline.element_id);
      } else {
        stableElements.push(baseline.element_id);
      }

      elementModeResults.push({
        element_id: baseline.element_id,
        element_text: baseline.element_text,
        essential: baseline.essential,
        affected_by_construction: isAffected,
        affecting_terms: affectingTermNames,
        baseline_match: baseline.match_result,
        broad_match: broadMatch,
        narrow_match: narrowMatch,
        reasoning: {
          baseline: baseline.reasoning,
          broad: broad?.reasoning ?? baseline.reasoning,
          narrow: narrow?.reasoning ?? baseline.reasoning,
        },
      });
    }

    const broadOutcome = deriveOutcome(broadResults, elements);
    const narrowOutcome = deriveOutcome(narrowResults, elements);
    const outcomesDiverge = broadOutcome !== narrowOutcome;

    const outcomeProfile: DirectInfringementOutcomeProfile = {
      broad_view: broadOutcome,
      narrow_view: narrowOutcome,
      divergence: outcomesDiverge,
    };

    let divergenceSummary: string;
    if (outcomesDiverge) {
      divergenceSummary =
        `Outcomes diverge: broad view yields ${broadOutcome.replace(/_/g, " ")}, ` +
        `narrow view yields ${narrowOutcome.replace(/_/g, " ")}. ` +
        `${divergentElements.length} element(s) changed between modes: ${divergentElements.join(", ")}.`;
    } else if (divergentElements.length > 0) {
      divergenceSummary =
        `Element-level differences exist (${divergentElements.join(", ")}) ` +
        `but overall outcome is stable: ${broadOutcome.replace(/_/g, " ")} under both modes.`;
    } else {
      divergenceSummary =
        `Result is stable across both interpretation modes: ${broadOutcome.replace(/_/g, " ")}. ` +
        "No element-level divergence detected.";
    }

    const divergence: DivergenceAssessment = {
      is_divergent: outcomesDiverge,
      stable_elements: stableElements,
      divergent_elements: divergentElements,
      summary: divergenceSummary,
    };

    context.di_outcome_profile = outcomeProfile;
    context.di_divergence = divergence;
    context.di_element_mode_results = elementModeResults;

    if (outcomesDiverge) {
      return {
        passed: "uncertain",
        effect: "outcome_divergence_detected",
        reasoning: divergenceSummary,
        triggered_rule: "divergence_synthesis",
      };
    }

    if (divergentElements.length > 0) {
      return {
        passed: "uncertain",
        effect: "element_divergence_stable_outcome",
        reasoning: divergenceSummary,
        triggered_rule: "divergence_synthesis",
      };
    }

    return {
      passed: true,
      effect: "no_divergence",
      reasoning: divergenceSummary,
    };
  },
};
