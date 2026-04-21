import { Rule, RuleContext, RuleResult } from "../rule-engine";
import {
  AgentInput,
  ClaimElement,
  MatchResult,
  ElementMatchResult,
  MatchingStyle,
} from "../../models";
import {
  ElementConstructionDependency,
} from "./construction-dependency-mapping";

function applyBroadMatching(
  baselineResult: MatchResult,
  baselineReasoning: string,
  matchingStyle: MatchingStyle,
  matchingNote: string,
  element: ClaimElement,
  accusedProduct: string
): { match: MatchResult; reasoning: string } {
  if (baselineResult === "matched") {
    return {
      match: "matched",
      reasoning: `Baseline already matched. Broad interpretation confirms: ${matchingNote}`,
    };
  }

  if (baselineResult === "not_matched") {
    if (
      matchingStyle === "functional_equivalent_allowed" ||
      matchingStyle === "role_based_inclusive"
    ) {
      const elemLower = element.text.toLowerCase();
      const prodLower = accusedProduct.toLowerCase();
      const keywords = elemLower
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .filter(
          (w) =>
            !["with", "that", "this", "from", "have", "each", "said",
              "wherein", "comprising", "configured", "adapted"].includes(w)
        );
      const partialOverlap = keywords.filter((kw) => prodLower.includes(kw)).length;
      const ratio = keywords.length > 0 ? partialOverlap / keywords.length : 0;

      if (ratio >= 0.2) {
        return {
          match: "uncertain",
          reasoning:
            `Under broad reading (${matchingNote}), partial functional overlap detected ` +
            `(${partialOverlap}/${keywords.length} keywords). ` +
            "Broad interpretation upgrades from not_matched to uncertain.",
        };
      }
    }

    return {
      match: "not_matched",
      reasoning:
        `Even under broad interpretation, insufficient overlap found. ${matchingNote}`,
    };
  }

  if (
    matchingStyle === "functional_equivalent_allowed" ||
    matchingStyle === "role_based_inclusive" ||
    matchingStyle === "loose_relational"
  ) {
    return {
      match: "matched",
      reasoning:
        `Under broad reading, uncertain element treated as matched. ${matchingNote}`,
    };
  }

  return {
    match: "uncertain",
    reasoning:
      `Broad interpretation applied but matching style "${matchingStyle}" does not resolve uncertainty. ${matchingNote}`,
  };
}

function applyNarrowMatching(
  baselineResult: MatchResult,
  baselineReasoning: string,
  matchingStyle: MatchingStyle,
  matchingNote: string,
  element: ClaimElement,
  accusedProduct: string
): { match: MatchResult; reasoning: string } {
  if (baselineResult === "not_matched") {
    return {
      match: "not_matched",
      reasoning: `Baseline not matched. Narrow interpretation confirms: ${matchingNote}`,
    };
  }

  if (baselineResult === "matched") {
    const hasExplicitPositiveMapping =
      baselineReasoning.toLowerCase().includes("explicit mapping indicates match") ||
      baselineReasoning.toLowerCase().includes("satisf");

    if (hasExplicitPositiveMapping) {
      return {
        match: "matched",
        reasoning: `Baseline matched via explicit mapping. Narrow interpretation does not override explicit evidence. ${matchingNote}`,
      };
    }

    if (
      matchingStyle === "dedicated_structure_required" ||
      matchingStyle === "specification_anchored" ||
      matchingStyle === "strict_relational"
    ) {
      const elemLower = element.text.toLowerCase();
      const prodLower = accusedProduct.toLowerCase();
      const keywords = elemLower
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .filter(
          (w) =>
            !["with", "that", "this", "from", "have", "each", "said",
              "wherein", "comprising", "configured", "adapted"].includes(w)
        );
      const matchedKw = keywords.filter((kw) => prodLower.includes(kw)).length;
      const ratio = keywords.length > 0 ? matchedKw / keywords.length : 0;

      if (ratio < 0.8) {
        return {
          match: "uncertain",
          reasoning:
            `Under narrow reading (${matchingNote}), keyword overlap (${matchedKw}/${keywords.length}) ` +
            "is insufficient for the stricter matching standard. Downgraded to uncertain.",
        };
      }
    }

    return {
      match: "matched",
      reasoning: `Even under narrow interpretation, element remains matched. ${matchingNote}`,
    };
  }

  if (
    matchingStyle === "dedicated_structure_required" ||
    matchingStyle === "specification_anchored" ||
    matchingStyle === "strict_relational"
  ) {
    return {
      match: "not_matched",
      reasoning:
        `Under narrow reading, uncertain element treated as not matched. ${matchingNote}`,
    };
  }

  return {
    match: "uncertain",
    reasoning:
      `Narrow interpretation applied but cannot definitively resolve. ${matchingNote}`,
  };
}

export const broadModeMatchingRule: Rule = {
  id: "di_broad_mode_matching",
  name: "Broad-Mode Element Matching",
  description:
    "Re-evaluates construction-affected elements under the broad interpretation mode. " +
    "Allows functional equivalents, looser structural similarity, and role-based wording.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const elements = context.di_elements as ClaimElement[];
    const baselineResults = context.di_element_results as ElementMatchResult[];
    const deps = context.di_construction_deps as ElementConstructionDependency[];
    const hasMap = !!context.di_has_construction_map;
    const accusedProduct = input.claims?.accused_product_description ?? "";

    if (!hasMap || !deps) {
      context.di_broad_results = baselineResults.map((r) => ({
        element_id: r.element_id,
        match: r.match_result,
        reasoning: r.reasoning,
      }));
      return {
        passed: true,
        effect: "no_broad_mode_needed",
        reasoning: "No construction map — broad mode matching skipped. Using baseline results.",
      };
    }

    const broadResults: Array<{ element_id: string; match: MatchResult; reasoning: string }> = [];

    for (const baseline of baselineResults) {
      const dep = deps.find((d) => d.element_id === baseline.element_id);
      const elem = elements.find((e) => e.id === baseline.element_id);

      if (!dep?.affected || dep.affecting_terms.length === 0 || !elem) {
        broadResults.push({
          element_id: baseline.element_id,
          match: baseline.match_result,
          reasoning: baseline.reasoning,
        });
        continue;
      }

      const primaryTerm = dep.affecting_terms[0];
      const { match, reasoning } = applyBroadMatching(
        baseline.match_result,
        baseline.reasoning,
        primaryTerm.mode_effects.broad.matching_style,
        primaryTerm.mode_effects.broad.matching_note,
        elem,
        accusedProduct
      );

      broadResults.push({ element_id: baseline.element_id, match, reasoning });
    }

    context.di_broad_results = broadResults;

    const upgraded = broadResults.filter((br, i) => {
      const baseline = baselineResults[i];
      return baseline && br.match !== baseline.match_result;
    });

    if (upgraded.length === 0) {
      return {
        passed: true,
        effect: "broad_mode_no_change",
        reasoning: "Broad-mode matching did not change any element results from baseline.",
      };
    }

    return {
      passed: "uncertain",
      effect: "broad_mode_applied",
      reasoning:
        `Broad-mode matching changed ${upgraded.length} element(s): ` +
        upgraded.map((u) => `${u.element_id} → ${u.match}`).join(", ") + ".",
      triggered_rule: "broad_mode_matching",
    };
  },
};

export const narrowModeMatchingRule: Rule = {
  id: "di_narrow_mode_matching",
  name: "Narrow-Mode Element Matching",
  description:
    "Re-evaluates construction-affected elements under the narrow interpretation mode. " +
    "Requires specific structural correspondence and stricter adherence to specification.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const elements = context.di_elements as ClaimElement[];
    const baselineResults = context.di_element_results as ElementMatchResult[];
    const deps = context.di_construction_deps as ElementConstructionDependency[];
    const hasMap = !!context.di_has_construction_map;
    const accusedProduct = input.claims?.accused_product_description ?? "";

    if (!hasMap || !deps) {
      context.di_narrow_results = baselineResults.map((r) => ({
        element_id: r.element_id,
        match: r.match_result,
        reasoning: r.reasoning,
      }));
      return {
        passed: true,
        effect: "no_narrow_mode_needed",
        reasoning: "No construction map — narrow mode matching skipped. Using baseline results.",
      };
    }

    const narrowResults: Array<{ element_id: string; match: MatchResult; reasoning: string }> = [];

    for (const baseline of baselineResults) {
      const dep = deps.find((d) => d.element_id === baseline.element_id);
      const elem = elements.find((e) => e.id === baseline.element_id);

      if (!dep?.affected || dep.affecting_terms.length === 0 || !elem) {
        narrowResults.push({
          element_id: baseline.element_id,
          match: baseline.match_result,
          reasoning: baseline.reasoning,
        });
        continue;
      }

      const primaryTerm = dep.affecting_terms[0];
      const { match, reasoning } = applyNarrowMatching(
        baseline.match_result,
        baseline.reasoning,
        primaryTerm.mode_effects.narrow.matching_style,
        primaryTerm.mode_effects.narrow.matching_note,
        elem,
        accusedProduct
      );

      narrowResults.push({ element_id: baseline.element_id, match, reasoning });
    }

    context.di_narrow_results = narrowResults;

    const downgraded = narrowResults.filter((nr, i) => {
      const baseline = baselineResults[i];
      return baseline && nr.match !== baseline.match_result;
    });

    if (downgraded.length === 0) {
      return {
        passed: true,
        effect: "narrow_mode_no_change",
        reasoning: "Narrow-mode matching did not change any element results from baseline.",
      };
    }

    return {
      passed: "uncertain",
      effect: "narrow_mode_applied",
      reasoning:
        `Narrow-mode matching changed ${downgraded.length} element(s): ` +
        downgraded.map((d) => `${d.element_id} → ${d.match}`).join(", ") + ".",
      triggered_rule: "narrow_mode_matching",
    };
  },
};
