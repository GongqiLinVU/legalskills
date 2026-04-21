import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ClaimElement } from "../../models";

function parseClaimText(claimText: string): ClaimElement[] {
  const elements: ClaimElement[] = [];

  const parts = claimText
    .split(/[;,]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  for (let i = 0; i < parts.length; i++) {
    elements.push({
      id: `parsed_${i + 1}`,
      text: parts[i],
      essential: true,
    });
  }

  return elements;
}

function fromStringElements(elements: string[]): ClaimElement[] {
  return elements.map((text, i) => ({
    id: `elem_${i + 1}`,
    text: text.trim(),
    essential: true,
  }));
}

export const elementExtractionRule: Rule = {
  id: "di_element_extraction",
  name: "Claim Element Extraction",
  description:
    "Extracts or receives claim elements for comparison. " +
    "Uses structured input if available; otherwise parses claim text heuristically.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const claims = input.claims;

    if (!claims) {
      context.di_elements = [];
      return {
        passed: false,
        effect: "no_elements",
        reasoning: "No claims data provided. Cannot extract elements.",
      };
    }

    if (claims.structured_elements && claims.structured_elements.length > 0) {
      context.di_elements = claims.structured_elements;
      return {
        passed: true,
        effect: "structured_elements_used",
        reasoning: `${claims.structured_elements.length} structured claim element(s) provided directly.`,
      };
    }

    if (claims.claim_elements && claims.claim_elements.length > 0) {
      context.di_elements = fromStringElements(claims.claim_elements);
      return {
        passed: true,
        effect: "string_elements_converted",
        reasoning: `${claims.claim_elements.length} claim element(s) converted from string list.`,
      };
    }

    if (claims.claim_text?.trim()) {
      const parsed = parseClaimText(claims.claim_text);
      if (parsed.length > 0) {
        context.di_elements = parsed;
        return {
          passed: "uncertain",
          effect: "elements_parsed_heuristically",
          reasoning:
            `Parsed ${parsed.length} provisional element(s) from claim text. ` +
            "This is a heuristic extraction — accuracy depends on claim structure.",
          triggered_rule: "heuristic_element_parsing",
        };
      }
    }

    context.di_elements = [];
    return {
      passed: false,
      effect: "extraction_failed",
      reasoning:
        "Could not extract claim elements from available input. " +
        "Provide structured elements or a detailed claim description.",
    };
  },
};
