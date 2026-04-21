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
    "This analysis is based on the information provided and does not constitute a formal infringement opinion. A definitive assessment would require detailed consideration of the patent specification, prosecution history, and relevant case law.",
  ];

  if (!inputQuality.complete) {
    warnings.push(
      `Incomplete information provided — missing: ${inputQuality.missing_fields.join(", ")}. The assessment may change once further details are available.`
    );
  }

  if (isConstructionSensitive) {
    warnings.push(
      "The outcome depends on how certain disputed claim terms are construed. Results should be treated as provisional until claim construction is resolved."
    );
  }

  if (triggered_rules.includes("heuristic_element_parsing")) {
    warnings.push(
      "Claim integers were extracted automatically from the claim text. Providing a structured breakdown of claim integers would improve accuracy."
    );
  }

  if (hasConstructionMap && divergence?.is_divergent) {
    warnings.push(
      "Broad and narrow constructions of the disputed terms produce different infringement outcomes. The conclusion depends on which construction is adopted by the court."
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
        "Insufficient information to assess direct infringement. " +
        "Both the patent claim and details of the accused product are required.",
    };
  }

  if (elementResults.length === 0) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "No claim integers could be identified from the information provided. " +
        "Please provide the claim text or a structured breakdown of the claim integers.",
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
      `Of the ${essentialResults.length} essential claim integers, ` +
      `${matched.length} ${matched.length === 1 ? "is" : "are"} present in the accused product` +
      (notMatched.length > 0 ? `, ${notMatched.length} ${notMatched.length === 1 ? "is" : "are"} not present` : "") +
      (uncertain.length > 0 ? `, and ${uncertain.length} remain${uncertain.length === 1 ? "s" : ""} uncertain` : "") +
      "."
    );

    if (divergence.is_divergent) {
      parts.push(
        `The outcome turns on claim construction. ` +
        `Under the broader construction, the assessment is ${outcomeProfile.broad_view.replace(/_/g, " ")}. ` +
        `Under the narrower construction, the assessment is ${outcomeProfile.narrow_view.replace(/_/g, " ")}.`
      );
      if (divergence.divergent_elements.length > 0) {
        parts.push(
          `${divergence.divergent_elements.length} claim integer(s) change between constructions.`
        );
      }
    } else if (divergence.divergent_elements.length > 0) {
      parts.push(
        `Although ${divergence.divergent_elements.length} integer(s) are affected by the choice of construction, ` +
        `the overall outcome is the same under both readings: ${outcomeProfile.broad_view.replace(/_/g, " ")}.`
      );
    } else {
      parts.push(
        `The outcome is stable regardless of which construction is adopted: ${outcomeProfile.broad_view.replace(/_/g, " ")}.`
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
        `${notMatched.length} essential claim integer(s) do not appear to be present in the accused product. ` +
        "Under the all-elements rule, the accused product must take every essential integer of the claim. " +
        "Direct infringement is unlikely on the information provided." +
        (needsConstruction
          ? " However, this conclusion is provisional — the assessment may change depending on how disputed claim terms are construed."
          : ""),
    };
  }

  if (matched.length === essentialResults.length) {
    return {
      likely_result: "likely_infringement",
      confidence: needsConstruction ? "medium" : inputQuality.complete ? "high" : "medium",
      explanation:
        `All ${essentialResults.length} essential claim integers appear to be present in the accused product. ` +
        "On the information provided, direct infringement is likely under the all-elements rule." +
        (needsConstruction
          ? " Note: the meaning of certain claim terms is in dispute. Formal claim construction may affect this assessment."
          : ""),
    };
  }

  if (uncertain.length > 0 && matched.length > 0) {
    return {
      likely_result: "possible_infringement",
      confidence: "medium",
      explanation:
        `${matched.length} claim integer(s) are present in the accused product, but ${uncertain.length} remain uncertain. ` +
        "Whether these uncertain integers are satisfied may depend on further factual investigation or claim construction." +
        (needsConstruction
          ? " Construction of the disputed claim terms is recommended before reaching a definitive view."
          : ""),
    };
  }

  if (uncertain.length === essentialResults.length) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "All essential claim integers are uncertain on the information provided. " +
        "A meaningful infringement assessment cannot be made without further factual detail or claim construction.",
    };
  }

  return {
    likely_result: "possible_infringement",
    confidence: "low",
    explanation:
      "The element-by-element comparison produces mixed results. " +
      "Further information and analysis are needed to determine whether all essential claim integers are satisfied.",
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
