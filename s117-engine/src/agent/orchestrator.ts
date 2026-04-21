import {
  AgentInput,
  AgentOutput,
  SkillOutput,
  ClaimConstructionResult,
  ClaimConstructionContext,
} from "../models";
import { detectIssues } from "./issue-detector";
import { planExecution } from "./planner";
import { getSkill } from "./skill-registry";
import { synthesize } from "../skills/synthesis/result-synthesizer";

export function evaluateCase(input: AgentInput): AgentOutput {
  const { issues, classifierOutput } = detectIssues(input);

  const plan = planExecution(input, issues);

  const skillResults: SkillOutput[] = [classifierOutput];

  const workingInput = { ...input };

  for (const skillName of plan.selected_skills) {
    const skill = getSkill(skillName);
    if (!skill) {
      skillResults.push({
        skill: skillName,
        status: "not_applicable",
        confidence: "low",
        decision_path: [],
        explanation: `Skill "${skillName}" is registered but could not be loaded.`,
        warnings: [`Skill "${skillName}" failed to load.`],
        suggested_next_skills: [],
      });
      continue;
    }

    const result = skill.evaluate(workingInput);
    skillResults.push(result);

    if (skillName === "claim_construction_skill" && result.raw_result) {
      const ccResult = result.raw_result as ClaimConstructionResult;
      if (ccResult.downstream_effect?.affects_direct_infringement) {
        const ccContext: ClaimConstructionContext = {
          interpretation_sensitive: true,
          construction_terms: ccResult.construction_terms,
          construction_map: ccResult.construction_map,
          recommended_mode: ccResult.downstream_effect.recommended_mode,
        };
        workingInput.claim_construction_context = ccContext;
      }
    }
  }

  const allSelectedSkills = [
    "issue_classifier_skill",
    ...plan.selected_skills,
  ];

  if (Object.keys(plan.skipped_reasons).length > 0) {
    const skippedWarnings = Object.entries(plan.skipped_reasons).map(
      ([name, reason]) => `Skill skipped — ${name}: ${reason}`
    );
    classifierOutput.warnings.push(...skippedWarnings);
  }

  return synthesize(workingInput, issues, allSelectedSkills, skillResults);
}
