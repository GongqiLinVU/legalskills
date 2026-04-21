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
    "This analysis identifies potentially ambiguous claim terms but does not constitute formal claim construction. The interpretation of claim language may differ following a full construction hearing.",
  ];

  if (constructionTerms.length > 0 && affectsDI) {
    warnings.push(
      "One or more claim terms require construction before a definitive infringement assessment can be made. The direct infringement analysis should be read in light of this uncertainty."
    );
  }

  if (input.claims?.specification_notes?.trim()) {
    warnings.push(
      "Specification notes have been considered, but a complete construction analysis would require examination of the full specification, prosecution history, and relevant case law."
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
        "No ambiguous or disputed claim terms were identified. " +
        "The claim language appears sufficiently clear to proceed with infringement analysis without a preliminary construction exercise.",
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

    const affectsSummary =
      likelyAffects.length > 0 && mayAffect.length > 0
        ? `Of these, ${likelyAffects.length} are likely to change the infringement outcome and ${mayAffect.length} may do so depending on the construction adopted.`
        : likelyAffects.length > 0
        ? `${likelyAffects.length === 1 ? "This term is" : "These terms are"} likely to change the infringement outcome depending on the construction adopted.`
        : `${mayAffect.length === 1 ? "This term" : "These terms"} may affect the infringement outcome depending on the construction adopted.`;

    return {
      result: "interpretation_sensitive",
      confidence: disputed.length > 0 ? "medium" : "medium",
      explanation:
        `The following claim terms require construction: ${termList}. ` +
        `${affectsSummary}` +
        (affectsDI
          ? " The direct infringement assessment below should be read as construction-sensitive."
          : ""),
    };
  }

  if (mayAffect.length > 0) {
    return {
      result: "interpretation_sensitive",
      confidence: "low",
      explanation:
        `${mayAffect.length} claim term(s) have been identified as potentially ambiguous. ` +
        "Whether these terms affect the infringement analysis depends on the construction adopted by the court.",
    };
  }

  return {
    result: "no_construction_issue",
    confidence: "medium",
    explanation:
      `${constructionTerms.length} term(s) were noted as potentially ambiguous, but none are likely to materially affect ` +
      "the infringement analysis on the information currently provided.",
  };
}
