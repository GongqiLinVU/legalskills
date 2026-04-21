import {
  AgentInput,
  DirectInfringementResult,
  DirectInfringementLikelihood,
  DirectInfringementOutcomeProfile,
  DivergenceAssessment,
  ElementModeMatchResult,
  Confidence,
  ElementMatchResult,
  InputQualityReport,
  DecisionStep,
} from "../models";
import { runRulePipeline, RuleResult } from "../rules/rule-engine";
import {
  diInputQualityRule,
  elementExtractionRule,
  elementMatchingRule,
  constructionDependencyMappingRule,
  broadModeMatchingRule,
  narrowModeMatchingRule,
  divergenceSynthesisRule,
  allElementsRule,
  claimInterpretationRule,
} from "../rules/direct-infringement";

export function evaluateDirectInfringement(
  input: AgentInput
): DirectInfringementResult {
  const context = { input };

  const rules = [
    diInputQualityRule,
    elementExtractionRule,
    elementMatchingRule,
    constructionDependencyMappingRule,
    broadModeMatchingRule,
    narrowModeMatchingRule,
    divergenceSynthesisRule,
    allElementsRule,
    claimInterpretationRule,
  ];

  const { steps, triggered_rules } = runRulePipeline(rules, context);

  const ctx = context as Record<string, unknown>;
  const inputQuality = ctx.di_input_quality as InputQualityReport;
  const elementResults = (ctx.di_element_results ?? []) as ElementMatchResult[];
  const needsConstruction = !!ctx.di_needs_claim_construction;
  const hasConstructionMap = !!ctx.di_has_construction_map;

  const elementModeResults = ctx.di_element_mode_results as
    | ElementModeMatchResult[]
    | undefined;
  const outcomeProfile = ctx.di_outcome_profile as
    | DirectInfringementOutcomeProfile
    | undefined;
  const divergence = ctx.di_divergence as DivergenceAssessment | undefined;

  const ccContext = input.claim_construction_context;
  const isConstructionSensitive =
    needsConstruction ||
    (ccContext?.interpretation_sensitive ?? false) ||
    hasConstructionMap;

  const { likely_result, confidence, explanation } = consolidate(
    inputQuality,
    elementResults,
    isConstructionSensitive,
    outcomeProfile,
    divergence
  );

  const warnings: string[] = [
    "This is a prototype element-matching tool, not legal advice.",
    "Element matching is heuristic — not a substitute for formal claim construction.",
  ];

  if (!inputQuality.complete) {
    warnings.push(
      `Input incomplete — missing: ${inputQuality.missing_fields.join(", ")}.`
    );
  }

  if (isConstructionSensitive) {
    warnings.push(
      "Claim interpretation uncertainty detected. Results are construction-sensitive — " +
      "outcome may change depending on how disputed terms are construed."
    );
  }

  if (triggered_rules.includes("heuristic_element_parsing")) {
    warnings.push(
      "Claim elements were parsed heuristically from claim text. Provide structured elements for higher accuracy."
    );
  }

  if (hasConstructionMap && divergence?.is_divergent) {
    warnings.push(
      "Construction-driven analysis reveals divergent outcomes under broad vs. narrow interpretation. " +
      "The infringement conclusion depends on which claim construction is adopted."
    );
  }

  const affectedElements = elementModeResults
    ? elementModeResults
        .filter((r) => r.affected_by_construction)
        .map((r) => r.element_id)
    : deriveAffectedElementsFallback(ccContext, elementResults);

  return {
    module: "direct_infringement",
    likely_result,
    confidence,
    decision_path: steps,
    element_results: elementResults,
    explanation,
    warnings,
    claim_interpretation_warning: isConstructionSensitive,
    interpretation_sensitive: isConstructionSensitive || undefined,
    affected_elements: affectedElements.length > 0 ? affectedElements : undefined,
    outcome_under_broad_view: outcomeProfile?.broad_view,
    outcome_under_narrow_view: outcomeProfile?.narrow_view,
    element_mode_results: elementModeResults,
    outcome_profile: outcomeProfile,
    divergence: divergence,
  };
}

function deriveAffectedElementsFallback(
  ccContext: AgentInput["claim_construction_context"],
  elementResults: ElementMatchResult[]
): string[] {
  if (!ccContext || ccContext.construction_terms.length === 0) return [];

  const affected: string[] = [];
  for (const ct of ccContext.construction_terms) {
    if (ct.source_element_id) {
      const exists = elementResults.find(
        (er) => er.element_id === ct.source_element_id
      );
      if (exists && !affected.includes(ct.source_element_id)) {
        affected.push(ct.source_element_id);
      }
    } else {
      for (const er of elementResults) {
        const ctLower = ct.term.toLowerCase();
        const erLower = er.element_text.toLowerCase();
        const ctWords = ctLower.split(/\s+/).filter((w) => w.length > 3);
        const overlap = ctWords.filter((w) => erLower.includes(w)).length;
        if (overlap >= 2 && !affected.includes(er.element_id)) {
          affected.push(er.element_id);
        }
      }
    }
  }

  return affected;
}

function consolidate(
  inputQuality: InputQualityReport,
  elementResults: ElementMatchResult[],
  needsConstruction: boolean,
  outcomeProfile: DirectInfringementOutcomeProfile | undefined,
  divergence: DivergenceAssessment | undefined
): {
  likely_result: DirectInfringementLikelihood;
  confidence: Confidence;
  explanation: string;
} {
  if (inputQuality.missing_fields.length >= 2) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "Insufficient input to perform direct infringement analysis. " +
        "Both claim description and accused product description are needed.",
    };
  }

  if (elementResults.length === 0) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "No claim elements could be extracted or matched. " +
        "Provide claim elements or a structured claim description.",
    };
  }

  const essentialResults = elementResults.filter((r) => r.essential);
  const matched = essentialResults.filter((r) => r.match_result === "matched");
  const notMatched = essentialResults.filter((r) => r.match_result === "not_matched");
  const uncertain = essentialResults.filter((r) => r.match_result === "uncertain");

  if (outcomeProfile && divergence) {
    const baselineResult = deriveBaselineLikelihood(matched.length, notMatched.length, uncertain.length, essentialResults.length);
    const conf = divergence.is_divergent ? "low" : needsConstruction ? "medium" : "medium";

    const parts: string[] = [];
    parts.push(
      `Baseline matching: ${matched.length} matched, ${notMatched.length} not matched, ${uncertain.length} uncertain ` +
      `out of ${essentialResults.length} essential element(s).`
    );

    if (divergence.is_divergent) {
      parts.push(
        `Construction-driven analysis reveals divergent outcomes: ` +
        `broad view → ${outcomeProfile.broad_view.replace(/_/g, " ")}, ` +
        `narrow view → ${outcomeProfile.narrow_view.replace(/_/g, " ")}.`
      );
      parts.push(divergence.summary);
    } else if (divergence.divergent_elements.length > 0) {
      parts.push(
        `Some elements differ between modes (${divergence.divergent_elements.join(", ")}), ` +
        `but the overall outcome is stable: ${outcomeProfile.broad_view.replace(/_/g, " ")}.`
      );
    } else {
      parts.push(
        `Result is stable across both interpretation modes: ${outcomeProfile.broad_view.replace(/_/g, " ")}.`
      );
    }

    return {
      likely_result: divergence.is_divergent ? "possible_infringement" : outcomeProfile.broad_view,
      confidence: conf,
      explanation: parts.join(" "),
    };
  }

  if (notMatched.length > 0) {
    return {
      likely_result: "unlikely_infringement",
      confidence: needsConstruction ? "low" : inputQuality.complete ? "high" : "medium",
      explanation:
        `${notMatched.length} essential claim element(s) do not appear to be present in the accused product. ` +
        "Under the all-elements rule, failure to satisfy even one essential element " +
        "means direct infringement is unlikely." +
        (needsConstruction
          ? " However, claim interpretation is uncertain — this conclusion may change after claim construction."
          : ""),
    };
  }

  if (matched.length === essentialResults.length) {
    return {
      likely_result: "likely_infringement",
      confidence: needsConstruction ? "medium" : inputQuality.complete ? "high" : "medium",
      explanation:
        `All ${essentialResults.length} essential claim element(s) appear to be matched in the accused product. ` +
        "This supports a finding of direct infringement under the all-elements rule." +
        (needsConstruction
          ? " Note: claim interpretation uncertainty exists — formal claim construction is recommended."
          : ""),
    };
  }

  if (uncertain.length > 0 && matched.length > 0) {
    return {
      likely_result: "possible_infringement",
      confidence: "medium",
      explanation:
        `${matched.length} element(s) matched and ${uncertain.length} remain uncertain. ` +
        "Infringement is possible but cannot be confirmed without resolving the uncertain elements." +
        (needsConstruction
          ? " Claim construction is recommended to clarify disputed terms."
          : ""),
    };
  }

  if (uncertain.length === essentialResults.length) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "All essential elements are uncertain. Cannot determine infringement " +
        "without further information or claim construction.",
    };
  }

  return {
    likely_result: "possible_infringement",
    confidence: "low",
    explanation:
      "Mixed matching results. Some elements matched, some uncertain. " +
      "Further analysis is needed to determine infringement.",
  };
}

function deriveBaselineLikelihood(
  matched: number,
  notMatched: number,
  uncertain: number,
  total: number
): DirectInfringementLikelihood {
  if (total === 0) return "insufficient_information";
  if (notMatched > 0) return "unlikely_infringement";
  if (matched === total) return "likely_infringement";
  if (uncertain > 0 && matched > 0) return "possible_infringement";
  return "insufficient_information";
}
