import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { S117EvaluationRequest, InputQualityReport } from "../../models";

function assessInputQuality(req: S117EvaluationRequest): InputQualityReport {
  const missing: string[] = [];
  const uncertain: string[] = [];

  if (!req.product?.product_name) missing.push("product.product_name");
  if (!req.product?.is_staple_commercial_product)
    missing.push("product.is_staple_commercial_product");
  if (!req.supplier_conduct?.has_reason_to_believe)
    missing.push("supplier_conduct.has_reason_to_believe");
  if (!req.supplier_conduct?.provided_instructions_for_infringing_use)
    missing.push(
      "supplier_conduct.provided_instructions_for_infringing_use"
    );
  if (!req.supplier_conduct?.induced_or_advertised_infringing_use)
    missing.push(
      "supplier_conduct.induced_or_advertised_infringing_use"
    );

  if (req.product?.is_staple_commercial_product === "uncertain")
    uncertain.push("product.is_staple_commercial_product");
  if (req.supplier_conduct?.has_reason_to_believe === "uncertain")
    uncertain.push("supplier_conduct.has_reason_to_believe");
  if (
    req.supplier_conduct?.provided_instructions_for_infringing_use ===
    "uncertain"
  )
    uncertain.push(
      "supplier_conduct.provided_instructions_for_infringing_use"
    );
  if (
    req.supplier_conduct?.induced_or_advertised_infringing_use === "uncertain"
  )
    uncertain.push(
      "supplier_conduct.induced_or_advertised_infringing_use"
    );

  return {
    complete: missing.length === 0,
    missing_fields: missing,
    uncertain_fields: uncertain,
  };
}

export const inputQualityRule: Rule = {
  id: "input_quality_check",
  name: "Input Quality / Completeness",
  description: "Checks whether the input has sufficient fields to reason about s117",
  evaluate(context: RuleContext): RuleResult {
    const req = context.request as S117EvaluationRequest;
    const report = assessInputQuality(req);
    context.input_quality = report;

    const hasCriticalGaps = report.missing_fields.length > 2;

    return {
      passed: report.complete,
      effect: hasCriticalGaps
        ? "confidence_severely_degraded"
        : report.complete
        ? "full_input_available"
        : "confidence_reduced",
      reasoning: report.complete
        ? "All key input fields are present."
        : `Missing fields: ${report.missing_fields.join(", ")}. ` +
          (report.uncertain_fields.length > 0
            ? `Uncertain fields: ${report.uncertain_fields.join(", ")}.`
            : ""),
      triggered_rule: hasCriticalGaps
        ? "IF critical input fields missing THEN confidence severely reduced and result may be insufficient_information"
        : undefined,
    };
  },
};
