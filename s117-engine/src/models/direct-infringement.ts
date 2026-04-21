import { Confidence, DecisionStep } from "./output";
import { ConstructionMode } from "./claim-construction";

export type MatchResult = "matched" | "not_matched" | "uncertain";

export type DirectInfringementLikelihood =
  | "likely_infringement"
  | "possible_infringement"
  | "unlikely_infringement"
  | "insufficient_information";

export interface ElementMatchResult {
  element_id: string;
  element_text: string;
  essential: boolean;
  match_result: MatchResult;
  reasoning: string;
}

export interface ElementModeMatchResult {
  element_id: string;
  element_text: string;
  essential: boolean;
  affected_by_construction: boolean;
  affecting_terms: string[];
  baseline_match: MatchResult;
  broad_match: MatchResult;
  narrow_match: MatchResult;
  reasoning: {
    baseline: string;
    broad: string;
    narrow: string;
  };
}

export interface DirectInfringementOutcomeProfile {
  broad_view: DirectInfringementLikelihood;
  narrow_view: DirectInfringementLikelihood;
  divergence: boolean;
}

export interface DivergenceAssessment {
  is_divergent: boolean;
  stable_elements: string[];
  divergent_elements: string[];
  summary: string;
}

export interface DirectInfringementResult {
  module: "direct_infringement";
  likely_result: DirectInfringementLikelihood;
  confidence: Confidence;
  decision_path: DecisionStep[];
  element_results: ElementMatchResult[];
  explanation: string;
  warnings: string[];
  claim_interpretation_warning: boolean;
  interpretation_sensitive?: boolean;
  affected_elements?: string[];
  outcome_under_broad_view?: DirectInfringementLikelihood;
  outcome_under_narrow_view?: DirectInfringementLikelihood;
  element_mode_results?: ElementModeMatchResult[];
  outcome_profile?: DirectInfringementOutcomeProfile;
  divergence?: DivergenceAssessment;
}
