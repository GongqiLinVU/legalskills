import { Request, Response } from "express";
import { S117EvaluationRequest } from "../models";
import { evaluateS117 } from "../services/s117-evaluator";

function validateRequest(body: unknown): {
  valid: boolean;
  request?: S117EvaluationRequest;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  if (!b.product || typeof b.product !== "object") {
    return {
      valid: false,
      error: "Missing required field: product (object with product_name and is_staple_commercial_product).",
    };
  }

  const product = b.product as Record<string, unknown>;
  if (!product.product_name || typeof product.product_name !== "string") {
    return {
      valid: false,
      error: "Missing required field: product.product_name (string).",
    };
  }

  if (!b.supplier_conduct || typeof b.supplier_conduct !== "object") {
    return {
      valid: false,
      error: "Missing required field: supplier_conduct (object).",
    };
  }

  const defaults: S117EvaluationRequest = {
    patent_context: (b.patent_context as S117EvaluationRequest["patent_context"]) ?? {},
    product: {
      product_name: product.product_name as string,
      product_description: (product.product_description as string) ?? undefined,
      is_staple_commercial_product:
        (product.is_staple_commercial_product as S117EvaluationRequest["product"]["is_staple_commercial_product"]) ?? "uncertain",
      staple_reasoning: (product.staple_reasoning as string) ?? undefined,
      has_non_infringing_uses:
        (product.has_non_infringing_uses as S117EvaluationRequest["product"]["has_non_infringing_uses"]) ?? "uncertain",
    },
    supplier_conduct: {
      has_reason_to_believe:
        ((b.supplier_conduct as Record<string, unknown>).has_reason_to_believe as S117EvaluationRequest["supplier_conduct"]["has_reason_to_believe"]) ?? "uncertain",
      reason_to_believe_details:
        ((b.supplier_conduct as Record<string, unknown>).reason_to_believe_details as string) ?? undefined,
      provided_instructions_for_infringing_use:
        ((b.supplier_conduct as Record<string, unknown>).provided_instructions_for_infringing_use as S117EvaluationRequest["supplier_conduct"]["provided_instructions_for_infringing_use"]) ?? "uncertain",
      instructions_details:
        ((b.supplier_conduct as Record<string, unknown>).instructions_details as string) ?? undefined,
      induced_or_advertised_infringing_use:
        ((b.supplier_conduct as Record<string, unknown>).induced_or_advertised_infringing_use as S117EvaluationRequest["supplier_conduct"]["induced_or_advertised_infringing_use"]) ?? "uncertain",
      inducement_details:
        ((b.supplier_conduct as Record<string, unknown>).inducement_details as string) ?? undefined,
    },
    evidence_flags: {
      has_expert_evidence:
        ((b.evidence_flags as Record<string, unknown>)?.has_expert_evidence as boolean) ?? false,
      has_documentary_evidence:
        ((b.evidence_flags as Record<string, unknown>)?.has_documentary_evidence as boolean) ?? false,
      has_advertising_evidence:
        ((b.evidence_flags as Record<string, unknown>)?.has_advertising_evidence as boolean) ?? false,
      has_customer_testimony:
        ((b.evidence_flags as Record<string, unknown>)?.has_customer_testimony as boolean) ?? false,
      evidence_notes:
        ((b.evidence_flags as Record<string, unknown>)?.evidence_notes as string) ?? undefined,
    },
  };

  return { valid: true, request: defaults };
}

export function handleEvaluateS117(req: Request, res: Response): void {
  const validation = validateRequest(req.body);

  if (!validation.valid) {
    res.status(400).json({
      error: "validation_error",
      message: validation.error,
    });
    return;
  }

  const result = evaluateS117(validation.request!);
  res.json(result);
}

export function handleHealthCheck(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    module: "s117_indirect_infringement",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
