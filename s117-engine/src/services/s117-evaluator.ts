import {
  S117EvaluationRequest,
  S117EvaluationResult,
  InputQualityReport,
  LikelyResult,
  Confidence,
  DecisionStep,
} from "../models";
import { runRulePipeline, RuleResult } from "../rules/rule-engine";
import {
  inputQualityRule,
  stapleProductRule,
  supplierKnowledgeRule,
  instructionsInducementRule,
} from "../rules/s117";

const DISCLAIMER_WARNINGS = [
  "This analysis does not constitute legal advice. The assessment is based on the factual characterisation provided and may differ upon closer examination of the evidence.",
  "The outcome depends on how the product and supplier conduct are characterised on the facts. Matters of evidence and credibility may affect the result.",
  "This analysis addresses supplier liability under s117 of the Patents Act 1990 (Cth) only. It does not assess direct infringement, patent validity, or other causes of action.",
];

export function evaluateS117(
  request: S117EvaluationRequest
): S117EvaluationResult {
  const context = { request };

  const rules = [
    inputQualityRule,
    stapleProductRule,
    supplierKnowledgeRule,
    instructionsInducementRule,
  ];

  const { steps, triggered_rules } = runRulePipeline(rules, context);

  const inputQuality = (context as Record<string, unknown>)
    .input_quality as InputQualityReport;

  const stapleResult = (context as Record<string, unknown>)[
    "__result_staple_product_test"
  ] as RuleResult;
  const knowledgeResult = (context as Record<string, unknown>)[
    "__result_supplier_knowledge_test"
  ] as RuleResult;
  const instructionsResult = (context as Record<string, unknown>)[
    "__result_instructions_or_inducement_test"
  ] as RuleResult;

  const { likely_result, confidence, explanation } = consolidate(
    inputQuality,
    stapleResult,
    knowledgeResult,
    instructionsResult,
    steps
  );

  const warnings = [...DISCLAIMER_WARNINGS];
  if (!inputQuality.complete) {
    warnings.push(
      `Input is incomplete — missing: ${inputQuality.missing_fields.join(", ")}. Confidence is reduced.`
    );
  }
  if (inputQuality.uncertain_fields.length > 0) {
    warnings.push(
      `Uncertain inputs on: ${inputQuality.uncertain_fields.join(", ")}. Result should be treated with caution.`
    );
  }

  return {
    module: "s117_indirect_infringement",
    likely_result,
    confidence,
    decision_path: steps,
    triggered_rules,
    explanation,
    warnings,
    input_quality: inputQuality,
  };
}

function consolidate(
  inputQuality: InputQualityReport,
  staple: RuleResult,
  knowledge: RuleResult,
  instructions: RuleResult,
  _steps: DecisionStep[]
): { likely_result: LikelyResult; confidence: Confidence; explanation: string } {
  if (inputQuality.missing_fields.length > 2) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "Too many critical input fields are missing to produce a meaningful assessment. " +
        "Please provide at minimum: product information, staple product characterisation, " +
        "and supplier conduct details.",
    };
  }

  const isStaple = staple.passed === true;
  const stapleUncertain = staple.passed === "uncertain";
  const hasKnowledge = knowledge.passed === true;
  const knowledgeUncertain = knowledge.passed === "uncertain";
  const hasOverride = instructions.passed === true;
  const overrideUncertain = instructions.passed === "uncertain";
  const strongOverride =
    instructions.effect === "strong_override";

  // Path 1: Non-staple product with supplier knowledge → likely infringement
  if (!isStaple && !stapleUncertain && hasKnowledge) {
    return {
      likely_result: "likely_infringement",
      confidence: inputQuality.complete ? "high" : "medium",
      explanation:
        "The product is not a staple commercial product and the supplier " +
        "had reason to believe it would be used to infringe the patent. " +
        "Under s117, this combination supports a finding of indirect infringement.",
    };
  }

  // Path 2: Non-staple, no clear knowledge but has override evidence
  if (!isStaple && !stapleUncertain && !hasKnowledge && hasOverride) {
    return {
      likely_result: "possible_infringement",
      confidence: "medium",
      explanation:
        "The product is not a staple commercial product. While supplier knowledge " +
        "is not clearly established, there is evidence of instructions or inducement " +
        "toward infringing use, which may support s117 liability.",
    };
  }

  // Path 3: Staple product with strong override (instructions + inducement)
  if (isStaple && hasOverride && strongOverride) {
    return {
      likely_result: "possible_infringement",
      confidence: "medium",
      explanation:
        "Although the product is a staple commercial product (which normally " +
        "weakens the s117 pathway significantly), there is strong evidence of " +
        "both instructions and inducement toward infringing use. " +
        "This may be sufficient to override the staple gatekeeper.",
    };
  }

  // Path 4: Staple product with moderate override
  if (isStaple && hasOverride && !strongOverride) {
    return {
      likely_result: "possible_infringement",
      confidence: "low",
      explanation:
        "The product is a staple commercial product, which significantly weakens " +
        "the s117 pathway. There is some evidence of instructions or inducement, " +
        "but it may not be sufficient to fully override the staple gatekeeper. " +
        "The outcome is uncertain and would depend heavily on the strength of that evidence.",
    };
  }

  // Path 5: Staple product, no override → unlikely infringement
  if (isStaple && !hasOverride && !overrideUncertain) {
    return {
      likely_result: "unlikely_infringement",
      confidence: inputQuality.complete ? "high" : "medium",
      explanation:
        "The product is a staple commercial product and there is no evidence of " +
        "instructions or inducement toward infringing use. " +
        "Under the s117 analysis (consistent with Hood v Down Under Enterprises), " +
        "indirect infringement is unlikely in these circumstances.",
    };
  }

  // Path 6: Non-staple, no knowledge, no override → unlikely
  if (!isStaple && !stapleUncertain && !hasKnowledge && !knowledgeUncertain && !hasOverride && !overrideUncertain) {
    return {
      likely_result: "unlikely_infringement",
      confidence: "medium",
      explanation:
        "The product is not a staple commercial product, but there is no evidence " +
        "of supplier knowledge or instructions/inducement toward infringing use. " +
        "Without these elements, s117 liability is unlikely to be established.",
    };
  }

  // Path 7: Significant uncertainty across multiple factors
  const uncertainCount = [stapleUncertain, knowledgeUncertain, overrideUncertain].filter(Boolean).length;
  if (uncertainCount >= 2) {
    return {
      likely_result: "insufficient_information",
      confidence: "low",
      explanation:
        "Multiple critical factors (staple status, supplier knowledge, " +
        "instructions/inducement) are uncertain. A reliable assessment " +
        "cannot be made without further factual investigation.",
    };
  }

  // Fallback: mixed signals
  return {
    likely_result: "possible_infringement",
    confidence: "low",
    explanation:
      "The inputs present a mixed picture. Some factors point toward " +
      "possible s117 liability while others are inconclusive. " +
      "Further evidence and factual analysis would be needed to reach " +
      "a firmer assessment.",
  };
}
