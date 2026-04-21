import {
  AgentInput,
  ClaimConstructionResult,
  ConstructionResultStatus,
  ConstructionTerm,
  ConstructionMap,
  ConstructionTermEffect,
  ConstructionModeEffect,
  MatchingStyle,
  AmbiguityType,
  ClaimElement,
  Confidence,
  DecisionStep,
} from "../models";
import { runRulePipeline } from "../rules/rule-engine";
import {
  sensitivityDetectionRule,
  candidateInterpretationsRule,
  downstreamImpactRule,
} from "../rules/claim-construction";

const MODE_EFFECT_TEMPLATES: Record<AmbiguityType, { broad: ConstructionModeEffect; narrow: ConstructionModeEffect }> = {
  functional_term: {
    broad: {
      matching_style: "functional_equivalent_allowed",
      matching_note: "Any component performing the stated function may satisfy this term, regardless of specific structure.",
    },
    narrow: {
      matching_style: "dedicated_structure_required",
      matching_note: "Requires a distinct structure or implementation consistent with the specification.",
    },
  },
  vague_relational: {
    broad: {
      matching_style: "loose_relational",
      matching_note: "Interpreted without strict spatial, temporal, or quantitative limits.",
    },
    narrow: {
      matching_style: "strict_relational",
      matching_note: "Interpreted with reference to specific parameters described in the specification.",
    },
  },
  contextual_term: {
    broad: {
      matching_style: "role_based_inclusive",
      matching_note: "Any structural or functional equivalent fulfilling the stated role satisfies this term.",
    },
    narrow: {
      matching_style: "specification_anchored",
      matching_note: "Only the specific implementation described in the patent specification satisfies this term.",
    },
  },
  specification_dependent: {
    broad: {
      matching_style: "role_based_inclusive",
      matching_note: "Read in its ordinary technical meaning without importing specification limitations.",
    },
    narrow: {
      matching_style: "specification_anchored",
      matching_note: "Construed in light of the specification, limiting scope to disclosed embodiments.",
    },
  },
  disputed_by_user: {
    broad: {
      matching_style: "functional_equivalent_allowed",
      matching_note: "Interpreted in the broadest reasonable manner consistent with the claim language.",
    },
    narrow: {
      matching_style: "dedicated_structure_required",
      matching_note: "Interpreted restrictively in line with the narrowest supported reading.",
    },
  },
};

function resolveAffectedElements(
  term: ConstructionTerm,
  elements: ClaimElement[]
): string[] {
  const affected: string[] = [];

  if (term.source_element_id) {
    const exists = elements.find((e) => e.id === term.source_element_id);
    if (exists) affected.push(term.source_element_id);
  }

  const termLower = term.term.toLowerCase();
  const termWords = termLower.split(/\s+/).filter((w) => w.length > 3);

  for (const elem of elements) {
    if (affected.includes(elem.id)) continue;
    const elemLower = elem.text.toLowerCase();
    const overlap = termWords.filter((w) => elemLower.includes(w)).length;
    if (overlap >= 2 || elemLower.includes(termLower)) {
      affected.push(elem.id);
    }
  }

  return affected;
}

function buildConstructionMap(
  constructionTerms: ConstructionTerm[],
  elements: ClaimElement[]
): ConstructionMap {
  const termEffects: ConstructionTermEffect[] = [];

  for (const ct of constructionTerms) {
    if (ct.downstream_impact === "unlikely_to_affect") continue;

    const affectedIds = resolveAffectedElements(ct, elements);
    const modeTemplate = MODE_EFFECT_TEMPLATES[ct.ambiguity_type];

    termEffects.push({
      term: ct.term,
      source_element_id: ct.source_element_id,
      ambiguity_type: ct.ambiguity_type,
      affects_elements: affectedIds,
      mode_effects: {
        broad: { ...modeTemplate.broad },
        narrow: { ...modeTemplate.narrow },
      },
    });
  }

  const hasMaterialDivergence = termEffects.some(
    (te) => te.mode_effects.broad.matching_style !== te.mode_effects.narrow.matching_style
  );

  return {
    construction_terms: termEffects,
    has_material_divergence: hasMaterialDivergence,
  };
}

export function evaluateClaimConstruction(
  input: AgentInput
): ClaimConstructionResult {
  const context = { input };

  const rules = [
    sensitivityDetectionRule,
    candidateInterpretationsRule,
    downstreamImpactRule,
  ];

  const { steps } = runRulePipeline(rules, context);

  const constructionTerms = ((context as Record<string, unknown>)
    .cc_construction_terms ?? []) as ConstructionTerm[];
  const affectsDI = !!(context as Record<string, unknown>).cc_affects_di;
  const recommendedMode = ((context as Record<string, unknown>)
    .cc_recommended_mode ?? "standard_matching") as
    | "standard_matching"
    | "construction_sensitive_matching";

  const elements: ClaimElement[] =
    input.claims?.structured_elements ??
    (input.claims?.claim_elements ?? []).map((text, i) => ({
      id: `elem_${i + 1}`,
      text: text.trim(),
      essential: true,
    }));

  const constructionMap = constructionTerms.length > 0 && affectsDI
    ? buildConstructionMap(constructionTerms, elements)
    : undefined;

  if (constructionMap) {
    const mapElementIds = new Set(
      constructionMap.construction_terms.flatMap((te) => te.affects_elements)
    );
    steps.push({
      step: "cc_construction_map_generated",
      result: "uncertain",
      effect: "construction_map_ready",
      reasoning:
        `Construction map produced with ${constructionMap.construction_terms.length} term effect(s) ` +
        `affecting ${mapElementIds.size} element(s). ` +
        (constructionMap.has_material_divergence
          ? "Broad and narrow modes use different matching styles — material divergence expected."
          : "Matching styles do not materially differ across modes."),
    });
  }

  const { result, confidence, explanation } = consolidate(
    constructionTerms,
    affectsDI,
    steps
  );

  const warnings: string[] = [
    "Claim construction is heuristic in this version and not a substitute for formal legal construction.",
  ];

  if (constructionTerms.length > 0 && affectsDI) {
    warnings.push(
      "One or more claim terms may affect infringement analysis. " +
      "Results should be treated as interpretation-sensitive."
    );
  }

  if (input.claims?.specification_notes?.trim()) {
    warnings.push(
      "Specification notes were considered but full specification parsing is not implemented in this version."
    );
  }

  return {
    module: "claim_construction",
    result,
    confidence,
    decision_path: steps,
    construction_terms: constructionTerms,
    construction_map: constructionMap,
    explanation,
    warnings,
    downstream_effect: {
      affects_direct_infringement: affectsDI,
      recommended_mode: recommendedMode,
    },
  };
}

function consolidate(
  constructionTerms: ConstructionTerm[],
  affectsDI: boolean,
  _steps: DecisionStep[]
): {
  result: ConstructionResultStatus;
  confidence: Confidence;
  explanation: string;
} {
  if (constructionTerms.length === 0) {
    return {
      result: "no_construction_issue",
      confidence: "high",
      explanation:
        "No ambiguous, functional, or context-dependent terms were detected in the claim language. " +
        "Claim terms appear sufficiently clear for standard infringement analysis.",
    };
  }

  const likelyAffects = constructionTerms.filter(
    (t) => t.downstream_impact === "likely_affects"
  );
  const mayAffect = constructionTerms.filter(
    (t) => t.downstream_impact === "may_affect"
  );
  const disputed = constructionTerms.filter(
    (t) => t.ambiguity_type === "disputed_by_user"
  );

  if (likelyAffects.length > 0 || disputed.length > 0) {
    const termList = constructionTerms
      .filter((t) => t.downstream_impact !== "unlikely_to_affect")
      .map((t) => `"${t.term}"`)
      .join(", ");

    return {
      result: "interpretation_sensitive",
      confidence: disputed.length > 0 ? "medium" : "medium",
      explanation:
        `The claim includes ${constructionTerms.length} term(s) whose meaning may be ambiguous or disputed: ${termList}. ` +
        `${likelyAffects.length} term(s) are likely to affect, and ${mayAffect.length} may affect, ` +
        "whether the accused product falls within the claim scope. " +
        (affectsDI
          ? "Direct infringement results should be treated as construction-sensitive."
          : ""),
    };
  }

  if (mayAffect.length > 0) {
    return {
      result: "interpretation_sensitive",
      confidence: "low",
      explanation:
        `${mayAffect.length} term(s) were identified with potential ambiguity that may affect downstream analysis. ` +
        "The impact is uncertain and depends on which interpretation is adopted.",
    };
  }

  return {
    result: "no_construction_issue",
    confidence: "medium",
    explanation:
      `${constructionTerms.length} term(s) were flagged but none are likely to materially affect ` +
      "the current infringement analysis.",
  };
}
