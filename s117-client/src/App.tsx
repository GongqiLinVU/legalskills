import { useState } from "react";
import {
  S117EvaluationRequest,
  S117EvaluationResult,
  AgentOutput,
  AnalysisMode,
  PatentContext,
  ProductInfo,
  SupplierConduct,
  EvidenceFlags,
  ClaimInfo,
} from "./types";
import { evaluateS117, evaluateAgent } from "./services/api";
import { ScenarioSelector } from "./components/ScenarioSelector";
import { PatentContextSection } from "./components/PatentContextSection";
import { ProductSection } from "./components/ProductSection";
import { SupplierConductSection } from "./components/SupplierConductSection";
import { EvidenceFlagsSection } from "./components/EvidenceFlagsSection";
import { ClaimsSection } from "./components/ClaimsSection";
import { ResultPanel } from "./components/ResultPanel";
import { AgentResultPanel } from "./components/AgentResultPanel";

const INITIAL_PATENT: PatentContext = {};

const INITIAL_PRODUCT: ProductInfo = {
  product_name: "",
  is_staple_commercial_product: "uncertain",
  has_non_infringing_uses: "uncertain",
};

const INITIAL_SUPPLIER: SupplierConduct = {
  has_reason_to_believe: "uncertain",
  provided_instructions_for_infringing_use: "uncertain",
  induced_or_advertised_infringing_use: "uncertain",
};

const INITIAL_EVIDENCE: EvidenceFlags = {
  has_expert_evidence: false,
  has_documentary_evidence: false,
  has_advertising_evidence: false,
  has_customer_testimony: false,
};

const INITIAL_CLAIMS: ClaimInfo = {};

type View = "form" | "result" | "loading";

export default function App() {
  const [mode, setMode] = useState<AnalysisMode>("agent");
  const [patentContext, setPatentContext] =
    useState<PatentContext>(INITIAL_PATENT);
  const [product, setProduct] = useState<ProductInfo>(INITIAL_PRODUCT);
  const [supplierConduct, setSupplierConduct] =
    useState<SupplierConduct>(INITIAL_SUPPLIER);
  const [evidenceFlags, setEvidenceFlags] =
    useState<EvidenceFlags>(INITIAL_EVIDENCE);
  const [claimsInfo, setClaimsInfo] = useState<ClaimInfo>(INITIAL_CLAIMS);
  const [s117Result, setS117Result] = useState<S117EvaluationResult | null>(
    null
  );
  const [agentResult, setAgentResult] = useState<AgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("form");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "s117" && !product.product_name.trim()) {
      setError("Product name is required for s117 analysis.");
      return;
    }

    const hasProduct = !!product.product_name.trim();
    const hasSupplier = !!supplierConduct;
    const hasClaims =
      !!claimsInfo.accused_product_description?.trim() ||
      (claimsInfo.claim_elements?.length ?? 0) > 0 ||
      !!claimsInfo.claim_construction_disputed;

    if (mode === "agent" && !hasProduct && !hasClaims) {
      setError(
        "Please provide at least product information (for s117) or claim details (for direct infringement)."
      );
      return;
    }

    setView("loading");

    try {
      if (mode === "s117") {
        const request: S117EvaluationRequest = {
          patent_context: patentContext,
          product,
          supplier_conduct: supplierConduct,
          evidence_flags: evidenceFlags,
        };
        const res = await evaluateS117(request);
        setS117Result(res);
        setAgentResult(null);
      } else {
        const agentInput: Record<string, unknown> = {
          patent_context: patentContext,
          evidence: evidenceFlags,
        };
        if (hasProduct) {
          agentInput.product = product;
        }
        if (hasSupplier && hasProduct) {
          agentInput.supplier_conduct = supplierConduct;
        }
        if (hasClaims) {
          agentInput.claims = claimsInfo;
        }
        const res = await evaluateAgent(agentInput);
        setAgentResult(res);
        setS117Result(null);
      }
      setView("result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Is the backend running?"
      );
      setView("form");
    }
  }

  function handleReset() {
    setS117Result(null);
    setAgentResult(null);
    setView("form");
  }

  function handleLoadScenario(data: Record<string, unknown>) {
    const d = data as Record<string, unknown>;
    if (d.patent_context) setPatentContext(d.patent_context as PatentContext);
    if (d.product) setProduct(d.product as ProductInfo);
    if (d.supplier_conduct) setSupplierConduct(d.supplier_conduct as SupplierConduct);
    if (d.evidence_flags) setEvidenceFlags(d.evidence_flags as EvidenceFlags);
    if (d.evidence) setEvidenceFlags(d.evidence as EvidenceFlags);
    if (d.claims) setClaimsInfo(d.claims as ClaimInfo);
    setError(null);
  }

  function handleClearForm() {
    setPatentContext(INITIAL_PATENT);
    setProduct(INITIAL_PRODUCT);
    setSupplierConduct(INITIAL_SUPPLIER);
    setEvidenceFlags(INITIAL_EVIDENCE);
    setClaimsInfo(INITIAL_CLAIMS);
    setError(null);
  }

  const isAgent = mode === "agent";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>Legal Decision Agent</h1>
          <p className="header-subtitle">
            Multi-skill patent law analysis under Australian law
          </p>
        </div>
      </header>

      <main className="app-main">
        {view === "result" && s117Result ? (
          <ResultPanel result={s117Result} onReset={handleReset} />
        ) : view === "result" && agentResult ? (
          <AgentResultPanel result={agentResult} onReset={handleReset} />
        ) : (
          <form className="assessment-form" onSubmit={handleSubmit}>
            <div className="mode-toggle-bar">
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${isAgent ? "mode-btn--active" : ""}`}
                  onClick={() => setMode("agent")}
                >
                  Agent Analysis
                </button>
                <button
                  type="button"
                  className={`mode-btn ${!isAgent ? "mode-btn--active" : ""}`}
                  onClick={() => setMode("s117")}
                >
                  s117 Only
                </button>
              </div>
              <span className="mode-hint">
                {isAgent
                  ? "Agent detects issues, selects skills (direct infringement, s117, or both), and returns a multi-skill report."
                  : "Direct s117 indirect infringement evaluation (legacy)."}
              </span>
            </div>

            <div className="form-toolbar">
              <ScenarioSelector onSelect={handleLoadScenario} />
            </div>

            <div className="form-intro">
              <p>
                {isAgent
                  ? "Submit a case for agent analysis. The system will identify legal issues, select appropriate skills, and return a structured decision report. " +
                    "Fill in claim details for direct infringement analysis, product/supplier details for s117 analysis, or both. Fields marked with "
                  : "Complete the sections below to assess whether the supply of a product may give rise to indirect patent infringement under s 117. Fields marked with "}
                <span className="required">*</span>
                {" are required. All other fields improve the quality of the assessment."}
              </p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <PatentContextSection
              value={patentContext}
              onChange={setPatentContext}
            />

            {isAgent && (
              <ClaimsSection value={claimsInfo} onChange={setClaimsInfo} />
            )}

            <ProductSection value={product} onChange={setProduct} />
            <SupplierConductSection
              value={supplierConduct}
              onChange={setSupplierConduct}
            />
            <EvidenceFlagsSection
              value={evidenceFlags}
              onChange={setEvidenceFlags}
            />

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={view === "loading"}
              >
                {view === "loading"
                  ? "Analysing..."
                  : isAgent
                  ? "Run Agent Analysis"
                  : "Run s117 Assessment"}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleClearForm}
              >
                Clear Form
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Legal Decision Agent v0.4.0 &mdash; Prototype for research and
          analysis purposes only. Not legal advice.
        </p>
      </footer>
    </div>
  );
}
