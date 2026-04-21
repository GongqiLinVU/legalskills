import { Confidence, DecisionStep } from "./output";

export type AmbiguityType =
  | "functional_term"
  | "vague_relational"
  | "contextual_term"
  | "specification_dependent"
  | "disputed_by_user";

export type ConstructionImpact =
  | "likely_affects"
  | "may_affect"
  | "unlikely_to_affect";

export type ConstructionResultStatus =
  | "interpretation_sensitive"
  | "no_construction_issue"
  | "insufficient_information";

export type ConstructionMode = "broad" | "narrow";

export type MatchingStyle =
  | "functional_equivalent_allowed"
  | "dedicated_structure_required"
  | "loose_relational"
  | "strict_relational"
  | "role_based_inclusive"
  | "specification_anchored"
  | "standard";

export interface ConstructionModeEffect {
  matching_style: MatchingStyle;
  matching_note: string;
}

export interface ConstructionTermEffect {
  term: string;
  source_element_id?: string;
  ambiguity_type: AmbiguityType;
  affects_elements: string[];
  mode_effects: {
    broad: ConstructionModeEffect;
    narrow: ConstructionModeEffect;
  };
}

export interface ConstructionMap {
  construction_terms: ConstructionTermEffect[];
  has_material_divergence: boolean;
}

export interface ConstructionTerm {
  term: string;
  source_element_id?: string;
  ambiguity_type: AmbiguityType;
  broad_interpretation: string;
  narrow_interpretation: string;
  impact: string;
  downstream_impact: ConstructionImpact;
}

export interface ClaimConstructionResult {
  module: "claim_construction";
  result: ConstructionResultStatus;
  confidence: Confidence;
  decision_path: DecisionStep[];
  construction_terms: ConstructionTerm[];
  construction_map?: ConstructionMap;
  explanation: string;
  warnings: string[];
  downstream_effect: {
    affects_direct_infringement: boolean;
    recommended_mode: "standard_matching" | "construction_sensitive_matching";
  };
}

export interface ClaimConstructionContext {
  interpretation_sensitive: boolean;
  construction_terms: ConstructionTerm[];
  construction_map?: ConstructionMap;
  recommended_mode: "standard_matching" | "construction_sensitive_matching";
}
