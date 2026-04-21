import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ConstructionTerm, AmbiguityType } from "../../models";
import { SensitiveTerm } from "./sensitivity-detection";

const INTERPRETATION_TEMPLATES: Record<
  AmbiguityType,
  { broad: string; narrow: string; why: string }
> = {
  functional_term: {
    broad: "Any component or method capable of performing the recited function, regardless of structure",
    narrow: "Only the specific structure or method described in the patent specification for achieving the function",
    why:
      "Functional claim language can cover a wide range of implementations (broad) or be limited to " +
      "the disclosed embodiments (narrow), depending on claim construction doctrine.",
  },
  vague_relational: {
    broad: "Interpreted without strict spatial, temporal, or quantitative limits",
    narrow: "Interpreted with reference to specific parameters or relationships described in the specification",
    why:
      "Relative or qualitative terms lack inherent precision. Broad reading gives maximum scope; " +
      "narrow reading anchors meaning to the specification context.",
  },
  contextual_term: {
    broad: "Any structural or functional equivalent that fulfils the stated role in the claim",
    narrow: "Only the specific implementation described and enabled in the patent specification",
    why:
      "Generic structural terms (module, mechanism, unit) can encompass many embodiments or " +
      "be restricted to what the specification discloses.",
  },
  specification_dependent: {
    broad: "Read in its ordinary technical meaning without importing specification limitations",
    narrow: "Construed in light of the specification, potentially limiting scope to disclosed embodiments",
    why:
      "This term's meaning may differ depending on whether the specification is used to narrow " +
      "the plain meaning of the claim language.",
  },
  disputed_by_user: {
    broad: "Interpreted in the broadest reasonable manner consistent with the claim language",
    narrow: "Interpreted restrictively in line with the narrowest supported reading",
    why:
      "This term has been explicitly identified as disputed. The parties may advance different " +
      "constructions that materially affect infringement analysis.",
  },
};

function generateInterpretation(
  term: SensitiveTerm,
  specNotes: string
): ConstructionTerm {
  const template = INTERPRETATION_TEMPLATES[term.ambiguity_type];

  let broadInterp = template.broad;
  let narrowInterp = template.narrow;

  if (specNotes.trim()) {
    const lowerSpec = specNotes.toLowerCase();
    const lowerTerm = term.term.toLowerCase();
    const termWords = lowerTerm.split(/\s+/).filter((w) => w.length > 3);
    const specRelevant = termWords.some((w) => lowerSpec.includes(w));

    if (specRelevant) {
      narrowInterp += ". Specification notes may support a narrower reading.";
    }
  }

  return {
    term: term.term,
    source_element_id: term.source_element_id,
    ambiguity_type: term.ambiguity_type,
    broad_interpretation: `${broadInterp} — "${term.term}" read broadly.`,
    narrow_interpretation: `${narrowInterp} — "${term.term}" read narrowly.`,
    impact: template.why,
    downstream_impact: "may_affect",
  };
}

export const candidateInterpretationsRule: Rule = {
  id: "cc_candidate_interpretations",
  name: "Candidate Interpretation Generation",
  description:
    "For each sensitive term, generates broad and narrow candidate interpretations " +
    "along with reasoning about why the interpretation matters.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const sensitiveTerms = (context.cc_sensitive_terms ?? []) as SensitiveTerm[];
    const specNotes = input.claims?.specification_notes ?? "";

    if (sensitiveTerms.length === 0) {
      context.cc_construction_terms = [];
      return {
        passed: true,
        effect: "no_terms_to_interpret",
        reasoning: "No sensitive terms detected — no interpretations needed.",
      };
    }

    const constructionTerms: ConstructionTerm[] = sensitiveTerms.map((st) =>
      generateInterpretation(st, specNotes)
    );

    context.cc_construction_terms = constructionTerms;

    return {
      passed: "uncertain",
      effect: "interpretations_generated",
      reasoning:
        `Generated broad and narrow candidate interpretations for ${constructionTerms.length} term(s). ` +
        "Each term has at least two plausible readings that may affect downstream analysis.",
      triggered_rule: "candidate_interpretation_generation",
    };
  },
};
