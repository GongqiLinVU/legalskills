import { PatentContext, ProductInfo, SupplierConduct, EvidenceFlags } from "./input";
import { ClaimConstructionContext } from "./claim-construction";

export interface AgentInput {
  case_summary?: string;
  facts?: Record<string, unknown>;
  patent_context?: PatentContext;
  product?: ProductInfo;
  supplier_conduct?: SupplierConduct;
  claims?: ClaimInfo;
  prior_art?: PriorArtInfo;
  evidence?: EvidenceFlags;
  claim_construction_context?: ClaimConstructionContext;
}

export interface ClaimElement {
  id: string;
  text: string;
  essential?: boolean;
}

export interface ClaimInfo {
  claim_text?: string;
  claim_elements?: string[];
  structured_elements?: ClaimElement[];
  accused_product_description?: string;
  element_mapping_facts?: Record<string, string>;
  disputed_element_notes?: string;
  claim_construction_disputed?: boolean;
  specification_notes?: string;
}

export interface PriorArtInfo {
  prior_art_references?: PriorArtReference[];
  novelty_contested?: boolean;
  inventive_step_contested?: boolean;
}

export interface PriorArtReference {
  reference_id?: string;
  title?: string;
  date?: string;
  relevance_summary?: string;
}

export type LegalIssue =
  | "s117_indirect_infringement"
  | "direct_infringement"
  | "validity_novelty"
  | "validity_inventive_step"
  | "claim_construction"
  | "unknown";
