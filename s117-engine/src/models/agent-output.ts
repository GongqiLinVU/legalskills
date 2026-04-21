import { Confidence, DecisionStep } from "./output";
import { LegalIssue } from "./agent-input";
import { SkillOutput, SkillStatus } from "./skill-output";

export interface AgentOutput {
  module: "legal_decision_agent_v2";
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
