import { Skill, AgentInput, LegalIssue, SkillOutput } from "../models";

interface ClassificationSignal {
  issue: LegalIssue;
  reason: string;
  confidence: "high" | "medium" | "low";
}

const IMPLEMENTED_SKILLS = new Set(["s117_skill", "direct_infringement_skill", "claim_construction_skill"]);

function detectIssues(input: AgentInput): ClassificationSignal[] {
  const signals: ClassificationSignal[] = [];

  const hasProduct = !!input.product?.product_name;
  const hasSupplierConduct = !!input.supplier_conduct;
  const hasStapleInfo = !!input.product?.is_staple_commercial_product;
  const hasClaims = !!input.claims;
  const hasClaimText =
    !!input.claims?.claim_text ||
    (input.claims?.claim_elements?.length ?? 0) > 0 ||
    (input.claims?.structured_elements?.length ?? 0) > 0;
  const hasAccusedProduct = !!input.claims?.accused_product_description;
  const hasClaimDispute = !!input.claims?.claim_construction_disputed;
  const hasDisputedNotes = !!input.claims?.disputed_element_notes?.trim();
  const hasPriorArt = !!input.prior_art;
  const hasPriorArtRefs = (input.prior_art?.prior_art_references?.length ?? 0) > 0;
  const hasNoveltyContest = !!input.prior_art?.novelty_contested;
  const hasInventiveStepContest = !!input.prior_art?.inventive_step_contested;

  if (hasProduct && hasSupplierConduct && hasStapleInfo) {
    signals.push({
      issue: "s117_indirect_infringement",
      reason:
        "Product information, supplier conduct data, and staple characterisation present — " +
        "s117 indirect infringement analysis applicable.",
      confidence: "high",
    });
  } else if (hasProduct && hasSupplierConduct) {
    signals.push({
      issue: "s117_indirect_infringement",
      reason:
        "Product and supplier conduct present (staple status missing but can proceed with reduced confidence).",
      confidence: "medium",
    });
  }

  if (hasClaimText && hasAccusedProduct) {
    signals.push({
      issue: "direct_infringement",
      reason:
        "Claim description/elements and accused product description present — " +
        "direct infringement element-by-element comparison possible.",
      confidence: "high",
    });
  } else if (hasClaimText && !hasAccusedProduct && hasProduct) {
    signals.push({
      issue: "direct_infringement",
      reason:
        "Claim information present with product description available but no dedicated accused product mapping. " +
        "Direct infringement analysis may proceed with reduced confidence.",
      confidence: "low",
    });
  }

  if (hasClaimDispute) {
    signals.push({
      issue: "claim_construction",
      reason: "Claim construction is explicitly flagged as disputed.",
      confidence: "high",
    });
  } else if (hasDisputedNotes && hasClaimText) {
    signals.push({
      issue: "claim_construction",
      reason:
        "Disputed element notes present alongside claim data — " +
        "claim construction may be needed to resolve ambiguous terms.",
      confidence: "medium",
    });
  }

  if (hasPriorArt && hasPriorArtRefs && hasNoveltyContest) {
    signals.push({
      issue: "validity_novelty",
      reason: "Prior art references present and novelty is contested.",
      confidence: "high",
    });
  }

  if (hasPriorArt && hasPriorArtRefs && hasInventiveStepContest) {
    signals.push({
      issue: "validity_inventive_step",
      reason: "Prior art references present and inventive step is contested.",
      confidence: "high",
    });
  }

  if (
    hasClaimText &&
    !hasClaimDispute &&
    !hasDisputedNotes
  ) {
    const claimContent = (
      input.claims?.claim_text ??
      (input.claims?.claim_elements ?? []).join(" ") ??
      ""
    ).toLowerCase();

    const ambiguityMarkers = [
      "configured to", "adapted to", "arranged to", "substantially",
      "adjacent", "close proximity", "in communication with", "module",
      "mechanism", "means for", "operable to",
    ];

    const matchedMarkers = ambiguityMarkers.filter((m) =>
      claimContent.includes(m)
    );

    if (matchedMarkers.length >= 2) {
      signals.push({
        issue: "claim_construction",
        reason:
          `Claim language contains ${matchedMarkers.length} ambiguity markers (${matchedMarkers.slice(0, 3).join(", ")}). ` +
          "Claim construction analysis may help clarify element scope.",
        confidence: "low",
      });
    }
  }

  if (hasClaims && !hasClaimText && !hasAccusedProduct && !hasClaimDispute && !hasDisputedNotes) {
    signals.push({
      issue: "claim_construction",
      reason:
        "Claims section present but lacks detail — claim construction may be needed before further analysis.",
      confidence: "low",
    });
  }

  return signals;
}

export const issueClassifierSkill: Skill = {
  name: "issue_classifier_skill",
  description:
    "Inspects case input and identifies which legal issues are likely relevant. " +
    "Routes to direct infringement, s117 indirect infringement, or both. " +
    "Uses heuristic field-presence analysis (no LLM). Explicitly deterministic.",
  handledIssues: [
    "s117_indirect_infringement",
    "direct_infringement",
    "validity_novelty",
    "validity_inventive_step",
    "claim_construction",
    "unknown",
  ],

  canHandle(_input: AgentInput): boolean {
    return true;
  },

  evaluate(input: AgentInput): SkillOutput {
    const signals = detectIssues(input);
    const detectedIssues = signals.map((s) => s.issue);
    const warnings: string[] = [];
    const suggestedSkills: string[] = [];

    if (signals.length === 0) {
      warnings.push(
        "No recognisable legal issues could be identified from the provided input. " +
        "Ensure that relevant fields (product, supplier_conduct, claims, prior_art) are populated."
      );
    }

    if (detectedIssues.includes("s117_indirect_infringement")) {
      suggestedSkills.push("s117_skill");
    }
    if (detectedIssues.includes("direct_infringement")) {
      suggestedSkills.push("direct_infringement_skill");
    }
    if (detectedIssues.includes("claim_construction")) {
      suggestedSkills.push("claim_construction_skill");
    }
    if (detectedIssues.includes("validity_novelty")) {
      suggestedSkills.push("novelty_skill");
    }
    if (detectedIssues.includes("validity_inventive_step")) {
      suggestedSkills.push("inventive_step_skill");
    }

    const unsupported = suggestedSkills.filter((s) => !IMPLEMENTED_SKILLS.has(s));
    if (unsupported.length > 0) {
      warnings.push(
        `The following skills are not yet implemented: ${unsupported.join(", ")}. ` +
        "These issues were detected but cannot be analysed in this version."
      );
    }

    const hasBoth =
      detectedIssues.includes("direct_infringement") &&
      detectedIssues.includes("s117_indirect_infringement");

    if (hasBoth) {
      warnings.push(
        "Both direct infringement and s117 indirect infringement detected. " +
        "The agent will execute both skills and provide a consolidated analysis."
      );
    }

    const hasInput =
      !!input.product || !!input.supplier_conduct || !!input.claims || !!input.prior_art;

    const lowestConfidence = signals.length > 0
      ? signals.reduce(
          (min, s) => {
            const rank = { high: 3, medium: 2, low: 1 };
            return rank[s.confidence] < rank[min] ? s.confidence : min;
          },
          "high" as "high" | "medium" | "low"
        )
      : "low";

    return {
      skill: "issue_classifier_skill",
      status: signals.length > 0 ? "issue_detected" : hasInput ? "insufficient_information" : "not_applicable",
      confidence: signals.length > 0 ? lowestConfidence : "low",
      decision_path: signals.map((s, i) => ({
        step: `issue_detection_${i + 1}`,
        result: s.issue,
        effect: "issue_identified",
        reasoning: s.reason,
      })),
      explanation:
        signals.length > 0
          ? `Identified ${signals.length} potential legal issue(s): ${detectedIssues.join(", ")}.`
          : "No legal issues could be identified from the provided input.",
      warnings,
      suggested_next_skills: suggestedSkills,
      raw_result: { detected_issues: detectedIssues, signals },
    };
  },
};
