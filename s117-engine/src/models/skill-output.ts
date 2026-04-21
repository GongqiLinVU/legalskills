import { Confidence, DecisionStep } from "./output";

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
