import { Rule, RuleContext, RuleResult } from "../rule-engine";
import {
  AgentInput,
  ClaimElement,
  ConstructionMap,
  ConstructionTermEffect,
} from "../../models";

export interface ElementConstructionDependency {
  element_id: string;
  affected: boolean;
  affecting_terms: ConstructionTermEffect[];
}

export const constructionDependencyMappingRule: Rule = {
  id: "di_construction_dependency_mapping",
  name: "Construction-Aware Dependency Mapping",
  description:
    "Maps which claim elements are affected by which construction terms, " +
    "establishing the dependency graph for mode-sensitive matching.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const elements = context.di_elements as ClaimElement[];
    const constructionMap = input.claim_construction_context?.construction_map as
      | ConstructionMap
      | undefined;

    if (!constructionMap || constructionMap.construction_terms.length === 0) {
      const deps: ElementConstructionDependency[] = elements.map((e) => ({
        element_id: e.id,
        affected: false,
        affecting_terms: [],
      }));
      context.di_construction_deps = deps;
      context.di_has_construction_map = false;

      return {
        passed: true,
        effect: "no_construction_context",
        reasoning:
          "No construction map provided. All elements will use standard matching.",
      };
    }

    const deps: ElementConstructionDependency[] = [];
    let affectedCount = 0;

    for (const elem of elements) {
      const affecting = constructionMap.construction_terms.filter((ct) =>
        ct.affects_elements.includes(elem.id)
      );

      const isAffected = affecting.length > 0;
      if (isAffected) affectedCount++;

      deps.push({
        element_id: elem.id,
        affected: isAffected,
        affecting_terms: affecting,
      });
    }

    context.di_construction_deps = deps;
    context.di_has_construction_map = true;

    if (affectedCount === 0) {
      return {
        passed: true,
        effect: "no_element_overlap",
        reasoning:
          `Construction map contains ${constructionMap.construction_terms.length} term(s) ` +
          "but none map to current claim elements. Standard matching applies to all elements.",
      };
    }

    const affectedIds = deps
      .filter((d) => d.affected)
      .map((d) => d.element_id);

    return {
      passed: "uncertain",
      effect: "construction_dependencies_mapped",
      reasoning:
        `${affectedCount} of ${elements.length} element(s) are affected by construction terms: ${affectedIds.join(", ")}. ` +
        "These elements will be evaluated under both broad and narrow interpretation modes.",
      triggered_rule: "construction_dependency_mapping",
    };
  },
};
