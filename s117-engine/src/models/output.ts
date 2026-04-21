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

export interface S117EvaluationResult {
  module: "s117_indirect_infringement";
  likely_result: LikelyResult;
  confidence: Confidence;
  decision_path: DecisionStep[];
  triggered_rules: string[];
  explanation: string;
  warnings: string[];
  input_quality: InputQualityReport;
}

export interface InputQualityReport {
  complete: boolean;
  missing_fields: string[];
  uncertain_fields: string[];
}
