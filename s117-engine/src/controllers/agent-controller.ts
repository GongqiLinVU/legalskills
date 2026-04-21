import { Request, Response } from "express";
import { AgentInput } from "../models";
import { evaluateCase } from "../agent/orchestrator";
import { getSkill } from "../agent/skill-registry";

function validateAgentRequest(body: unknown): {
  valid: boolean;
  input?: AgentInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  const hasAnyContent =
    b.case_summary || b.facts || b.patent_context || b.product ||
    b.supplier_conduct || b.claims || b.prior_art || b.evidence;

  if (!hasAnyContent) {
    return {
      valid: false,
      error:
        "Request body must contain at least one of: case_summary, facts, patent_context, " +
        "product, supplier_conduct, claims, prior_art, evidence.",
    };
  }

  const input: AgentInput = {
    case_summary: b.case_summary as string | undefined,
    facts: b.facts as Record<string, unknown> | undefined,
    patent_context: b.patent_context as AgentInput["patent_context"],
    product: b.product as AgentInput["product"],
    supplier_conduct: b.supplier_conduct as AgentInput["supplier_conduct"],
    claims: b.claims as AgentInput["claims"],
    prior_art: b.prior_art as AgentInput["prior_art"],
    evidence: b.evidence as AgentInput["evidence"],
  };

  return { valid: true, input };
}

export function handleAgentEvaluate(req: Request, res: Response): void {
  const validation = validateAgentRequest(req.body);

  if (!validation.valid) {
    res.status(400).json({
      error: "validation_error",
      message: validation.error,
    });
    return;
  }

  const result = evaluateCase(validation.input!);
  res.json(result);
}

export function handleSkillEvaluate(req: Request, res: Response): void {
  const skillName = req.params.skillName;
  const skill = getSkill(skillName);

  if (!skill) {
    res.status(404).json({
      error: "skill_not_found",
      message: `Skill "${skillName}" is not registered.`,
    });
    return;
  }

  const validation = validateAgentRequest(req.body);
  if (!validation.valid) {
    res.status(400).json({
      error: "validation_error",
      message: validation.error,
    });
    return;
  }

  const result = skill.evaluate(validation.input!);
  res.json(result);
}

export function handleAgentHealthCheck(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    module: "legal_decision_agent_v2",
    version: "0.5.0",
    skills: ["issue_classifier_skill", "claim_construction_skill", "s117_skill", "direct_infringement_skill"],
    timestamp: new Date().toISOString(),
  });
}
