export type TriState = "true" | "false" | "uncertain";

export interface PatentContext {
  patent_number?: string;
  patent_title?: string;
  relevant_claims?: string[];
  claim_description?: string;
}

export interface ProductInfo {
  product_name: string;
  product_description?: string;
  is_staple_commercial_product: TriState;
  staple_reasoning?: string;
  has_non_infringing_uses: TriState;
}

export interface SupplierConduct {
  has_reason_to_believe: TriState;
  reason_to_believe_details?: string;
  provided_instructions_for_infringing_use: TriState;
  instructions_details?: string;
  induced_or_advertised_infringing_use: TriState;
  inducement_details?: string;
}

export interface EvidenceFlags {
  has_expert_evidence: boolean;
  has_documentary_evidence: boolean;
  has_advertising_evidence: boolean;
  has_customer_testimony: boolean;
  evidence_notes?: string;
}

export interface ClaimElement {
  id: string;
  text: string;
  essential?: boolean;
}

export interface ClaimInfo {
  claim_text?: string;
  claim_elements?: string[];
  structured_elements?: ClaimElement[];
  accused_product_description?: string;
  element_mapping_facts?: Record<string, string>;
  disputed_element_notes?: string;
  claim_construction_disputed?: boolean;
  specification_notes?: string;
}

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
  result: "interpretation_sensitive" | "no_construction_issue" | "insufficient_information";
  confidence: Confidence;
  construction_terms: ConstructionTerm[];
  explanation: string;
  warnings: string[];
  downstream_effect: {
    affects_direct_infringement: boolean;
    recommended_mode: string;
  };
}

export type MatchResult = "matched" | "not_matched" | "uncertain";

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
  broad_view: string;
  narrow_view: string;
  divergence: boolean;
}

export interface DivergenceAssessment {
  is_divergent: boolean;
  stable_elements: string[];
  divergent_elements: string[];
  summary: string;
}

export interface DirectInfringementRawResult {
  module: "direct_infringement";
  interpretation_sensitive?: boolean;
  affected_elements?: string[];
  outcome_under_broad_view?: string;
  outcome_under_narrow_view?: string;
  claim_interpretation_warning?: boolean;
  element_mode_results?: ElementModeMatchResult[];
  outcome_profile?: DirectInfringementOutcomeProfile;
  divergence?: DivergenceAssessment;
}

export interface S117EvaluationRequest {
  patent_context: PatentContext;
  product: ProductInfo;
  supplier_conduct: SupplierConduct;
  evidence_flags: EvidenceFlags;
}

export type LikelyResult =
  | "likely_infringement"
  | "possible_infringement"
  | "unlikely_infringement"
  | "insufficient_information";

export type Confidence = "high" | "medium" | "low";

export interface DecisionStep {
  step: string;
  result: boolean | string;
  effect: string;
  reasoning: string;
}

export interface InputQualityReport {
  complete: boolean;
  missing_fields: string[];
  uncertain_fields: string[];
}

export interface S117EvaluationResult {
  module: string;
  likely_result: LikelyResult;
  confidence: Confidence;
  decision_path: DecisionStep[];
  triggered_rules: string[];
  explanation: string;
  warnings: string[];
  input_quality: InputQualityReport;
}

// --- Agent types ---

export type LegalIssue =
  | "s117_indirect_infringement"
  | "direct_infringement"
  | "validity_novelty"
  | "validity_inventive_step"
  | "claim_construction"
  | "unknown";

export type SkillStatus =
  | "likely_infringement"
  | "possible_infringement"
  | "unlikely_infringement"
  | "insufficient_information"
  | "issue_detected"
  | "no_issue_detected"
  | "not_applicable";

export interface SkillOutput {
  skill: string;
  status: SkillStatus;
  confidence: Confidence;
  decision_path: DecisionStep[];
  explanation: string;
  warnings: string[];
  suggested_next_skills: string[];
  raw_result?: unknown;
}

export interface AgentInput {
  case_summary?: string;
  patent_context?: PatentContext;
  product?: ProductInfo;
  supplier_conduct?: SupplierConduct;
  claims?: ClaimInfo;
  evidence?: EvidenceFlags;
}

export interface AgentOutput {
  module: string;
  detected_issues: LegalIssue[];
  selected_skills: string[];
  overall_result: {
    status: SkillStatus;
    confidence: Confidence;
  };
  skill_results: SkillOutput[];
  decision_path: DecisionStep[];
  explanation: string;
  warnings: string[];
  suggested_next_skills: string[];
}

export type AnalysisMode = "agent" | "s117";
