import { AgentInput, LegalIssue } from "./agent-input";
import { SkillOutput } from "./skill-output";

export interface Skill {
  name: string;
  description: string;
  handledIssues: LegalIssue[];
  canHandle(input: AgentInput): boolean;
  evaluate(input: AgentInput): SkillOutput;
}
