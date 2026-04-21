import { AgentInput, LegalIssue, Skill } from "../models";
import { getAllSkills } from "./skill-registry";

export interface ExecutionPlan {
  selected_skills: string[];
  skipped_reasons: Record<string, string>;
}

const SKILL_EXECUTION_ORDER: Record<string, number> = {
  claim_construction_skill: 1,
  direct_infringement_skill: 2,
  s117_skill: 3,
};

export function planExecution(
  input: AgentInput,
  detectedIssues: LegalIssue[]
): ExecutionPlan {
  const allSkills = getAllSkills();
  const selected: string[] = [];
  const skipped: Record<string, string> = {};

  const relevantSkills = allSkills.filter(
    (skill) =>
      skill.name !== "issue_classifier_skill" &&
      skill.handledIssues.some((issue) => detectedIssues.includes(issue))
  );

  for (const skill of relevantSkills) {
    if (skill.canHandle(input)) {
      selected.push(skill.name);
    } else {
      skipped[skill.name] = "Input insufficient for this skill.";
    }
  }

  selected.sort((a, b) => {
    const orderA = SKILL_EXECUTION_ORDER[a] ?? 99;
    const orderB = SKILL_EXECUTION_ORDER[b] ?? 99;
    return orderA - orderB;
  });

  logUnhandledIssues(detectedIssues, allSkills, skipped);

  return { selected_skills: selected, skipped_reasons: skipped };
}

function logUnhandledIssues(
  issues: LegalIssue[],
  allSkills: Skill[],
  skipped: Record<string, string>
): void {
  const handledIssues = new Set(
    allSkills.flatMap((s) => s.handledIssues)
  );

  for (const issue of issues) {
    if (issue === "unknown") continue;
    if (!handledIssues.has(issue)) {
      skipped[`${issue}_skill`] = `No skill registered for issue: ${issue}.`;
    }
  }
}
