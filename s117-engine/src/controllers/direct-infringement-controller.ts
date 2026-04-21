import { Request, Response } from "express";
import { AgentInput } from "../models";
import { evaluateDirectInfringement } from "../services/direct-infringement-evaluator";

function validateDirectInfringementRequest(body: unknown): {
  valid: boolean;
  input?: AgentInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  if (!b.claims || typeof b.claims !== "object") {
    return {
      valid: false,
      error: "Missing required field: claims (object with claim_text or claim_elements and accused_product_description).",
    };
  }

  const claims = b.claims as Record<string, unknown>;
  const hasClaimInfo =
    !!claims.claim_text ||
    (Array.isArray(claims.claim_elements) && claims.claim_elements.length > 0) ||
    (Array.isArray(claims.structured_elements) && claims.structured_elements.length > 0);

  if (!hasClaimInfo) {
    return {
      valid: false,
      error: "Missing required claim information: provide claim_text, claim_elements, or structured_elements.",
    };
  }

  if (!claims.accused_product_description) {
    return {
      valid: false,
      error: "Missing required field: claims.accused_product_description.",
    };
  }

  const input: AgentInput = {
    patent_context: b.patent_context as AgentInput["patent_context"],
    claims: b.claims as AgentInput["claims"],
  };

  return { valid: true, input };
}

export function handleEvaluateDirectInfringement(
  req: Request,
  res: Response
): void {
  const validation = validateDirectInfringementRequest(req.body);

  if (!validation.valid) {
    res.status(400).json({
      error: "validation_error",
      message: validation.error,
    });
    return;
  }

  const result = evaluateDirectInfringement(validation.input!);
  res.json(result);
}
