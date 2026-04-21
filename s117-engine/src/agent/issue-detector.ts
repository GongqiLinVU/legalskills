import { AgentInput, LegalIssue, SkillOutput } from "../models";
import { issueClassifierSkill } from "../skills/issue-classifier-skill";

export interface IssueDetectionResult {
  issues: LegalIssue[];
  classifierOutput: SkillOutput;
}

export function detectIssues(input: AgentInput): IssueDetectionResult {
  const classifierOutput = issueClassifierSkill.evaluate(input);

  const rawResult = classifierOutput.raw_result as
    | { detected_issues: LegalIssue[] }
    | undefined;

  const issues: LegalIssue[] = rawResult?.detected_issues ?? [];

  if (issues.length === 0 && classifierOutput.status !== "not_applicable") {
    issues.push("unknown");
  }

  return { issues, classifierOutput };
}
