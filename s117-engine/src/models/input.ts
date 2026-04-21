export type TriState = "true" | "false" | "uncertain";

export interface PatentContext {
  patent_number?: string;
  patent_title?: string;
  relevant_claims?: string[];
  claim_description?: string;
}

export interface ProductInfo {
  product_name: string;
  product_description?: string;
  is_staple_commercial_product: TriState;
  staple_reasoning?: string;
  has_non_infringing_uses: TriState;
}

export interface SupplierConduct {
  has_reason_to_believe: TriState;
  reason_to_believe_details?: string;
  provided_instructions_for_infringing_use: TriState;
  instructions_details?: string;
  induced_or_advertised_infringing_use: TriState;
  inducement_details?: string;
}

export interface EvidenceFlags {
  has_expert_evidence: boolean;
  has_documentary_evidence: boolean;
  has_advertising_evidence: boolean;
  has_customer_testimony: boolean;
  evidence_notes?: string;
}

export interface S117EvaluationRequest {
  patent_context: PatentContext;
  product: ProductInfo;
  supplier_conduct: SupplierConduct;
  evidence_flags: EvidenceFlags;
}
