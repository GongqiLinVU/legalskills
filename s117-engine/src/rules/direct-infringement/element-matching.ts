import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ClaimElement, ElementMatchResult, MatchResult } from "../../models";

function matchElement(
  element: ClaimElement,
  accusedProduct: string,
  mappingFacts: Record<string, string>,
  disputedNotes: string
): ElementMatchResult {
  const lowerProduct = accusedProduct.toLowerCase();
  const lowerElement = element.text.toLowerCase();

  const explicitMapping = mappingFacts[element.id];

  if (explicitMapping) {
    const lowerMapping = explicitMapping.toLowerCase();

    const hasAmbiguity =
      lowerMapping.includes("may or may not") ||
      lowerMapping.includes("unclear") ||
      lowerMapping.includes("ambiguous") ||
      lowerMapping.includes("uncertain");

    if (hasAmbiguity) {
      return {
        element_id: element.id,
        element_text: element.text,
        essential: element.essential ?? true,
        match_result: "uncertain",
        reasoning: `Mapping provided but inconclusive: "${explicitMapping}"`,
      };
    }

    const hasNegative =
      lowerMapping.includes("no match") ||
      lowerMapping.includes("absent") ||
      lowerMapping.includes("missing") ||
      lowerMapping.includes("not present") ||
      lowerMapping.includes("not satisfied") ||
      lowerMapping.includes("does not") ||
      lowerMapping.includes("not matched") ||
      /\bnot\b/.test(lowerMapping);

    if (hasNegative) {
      return {
        element_id: element.id,
        element_text: element.text,
        essential: element.essential ?? true,
        match_result: "not_matched",
        reasoning: `Explicit mapping indicates no match: "${explicitMapping}"`,
      };
    }

    const hasPositive =
      lowerMapping.includes("match") ||
      lowerMapping.includes("satisf") ||
      lowerMapping.includes("present") ||
      lowerMapping.includes("yes");

    if (hasPositive) {
      return {
        element_id: element.id,
        element_text: element.text,
        essential: element.essential ?? true,
        match_result: "matched",
        reasoning: `Explicit mapping indicates match: "${explicitMapping}"`,
      };
    }

    return {
      element_id: element.id,
      element_text: element.text,
      essential: element.essential ?? true,
      match_result: "uncertain",
      reasoning: `Mapping provided but inconclusive: "${explicitMapping}"`,
    };
  }

  const lowerDisputed = disputedNotes.toLowerCase();
  const elementKeywords = lowerElement
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const disputeKeywordOverlap = elementKeywords.length > 0
    ? elementKeywords.filter((kw) => lowerDisputed.includes(kw)).length / elementKeywords.length
    : 0;

  const isDisputed =
    lowerDisputed.includes(element.id.toLowerCase()) ||
    lowerDisputed.includes(lowerElement.substring(0, 20)) ||
    disputeKeywordOverlap >= 0.5;

  if (isDisputed) {
    return {
      element_id: element.id,
      element_text: element.text,
      essential: element.essential ?? true,
      match_result: "uncertain",
      reasoning:
        "This element appears in the disputed notes. Claim construction may be needed to resolve ambiguity.",
    };
  }

  const keywords = lowerElement
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter(
      (w) =>
        ![
          "with",
          "that",
          "this",
          "from",
          "have",
          "each",
          "said",
          "wherein",
          "comprising",
          "configured",
          "adapted",
        ].includes(w)
    );

  const matchedKeywords = keywords.filter((kw) => lowerProduct.includes(kw));
  const matchRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

  let result: MatchResult;
  let reasoning: string;

  if (matchRatio >= 0.6) {
    result = "matched";
    reasoning = `Textual overlap suggests match (${matchedKeywords.length}/${keywords.length} keywords found in accused product description).`;
  } else if (matchRatio >= 0.3) {
    result = "uncertain";
    reasoning = `Partial textual overlap (${matchedKeywords.length}/${keywords.length} keywords). Detailed comparison needed.`;
  } else {
    result = "not_matched";
    reasoning = `Low textual overlap (${matchedKeywords.length}/${keywords.length} keywords). Element does not appear to be present in accused product.`;
  }

  return {
    element_id: element.id,
    element_text: element.text,
    essential: element.essential ?? true,
    match_result: result,
    reasoning,
  };
}

export const elementMatchingRule: Rule = {
  id: "di_element_matching",
  name: "Element-by-Element Matching",
  description:
    "Compares each claim element against the accused product description " +
    "using explicit mapping, disputed notes, and keyword overlap.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const elements = context.di_elements as ClaimElement[];
    const accusedProduct = input.claims?.accused_product_description ?? "";
    const mappingFacts = input.claims?.element_mapping_facts ?? {};
    const disputedNotes = input.claims?.disputed_element_notes ?? "";

    if (elements.length === 0) {
      context.di_element_results = [];
      return {
        passed: false,
        effect: "no_elements_to_match",
        reasoning: "No claim elements available for matching.",
      };
    }

    if (!accusedProduct.trim()) {
      context.di_element_results = elements.map((e) => ({
        element_id: e.id,
        element_text: e.text,
        essential: e.essential ?? true,
        match_result: "uncertain" as MatchResult,
        reasoning: "No accused product description provided — cannot assess.",
      }));
      return {
        passed: "uncertain",
        effect: "no_accused_product",
        reasoning:
          "Accused product description is missing. All elements marked as uncertain.",
      };
    }

    const results: ElementMatchResult[] = elements.map((e) =>
      matchElement(e, accusedProduct, mappingFacts, disputedNotes)
    );

    context.di_element_results = results;

    const matched = results.filter((r) => r.match_result === "matched").length;
    const notMatched = results.filter((r) => r.match_result === "not_matched").length;
    const uncertain = results.filter((r) => r.match_result === "uncertain").length;

    return {
      passed: notMatched === 0 && uncertain === 0,
      effect: "matching_complete",
      reasoning:
        `Element matching complete: ${matched} matched, ${notMatched} not matched, ${uncertain} uncertain ` +
        `out of ${results.length} element(s).`,
    };
  },
};
