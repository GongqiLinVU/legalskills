import { DecisionStep } from "../models";

export interface RuleContext {
  [key: string]: unknown;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  evaluate: (context: RuleContext) => RuleResult;
}

export interface RuleResult {
  passed: boolean | string;
  effect: string;
  reasoning: string;
  triggered_rule?: string;
}

export function runRulePipeline(
  rules: Rule[],
  context: RuleContext
): { steps: DecisionStep[]; triggered_rules: string[] } {
  const steps: DecisionStep[] = [];
  const triggered_rules: string[] = [];

  for (const rule of rules) {
    const result = rule.evaluate(context);

    steps.push({
      step: rule.id,
      result: result.passed,
      effect: result.effect,
      reasoning: result.reasoning,
    });

    if (result.triggered_rule) {
      triggered_rules.push(result.triggered_rule);
    }

    context[`__result_${rule.id}`] = result;
  }

  return { steps, triggered_rules };
}
