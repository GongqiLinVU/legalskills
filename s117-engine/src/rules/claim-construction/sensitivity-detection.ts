import { Rule, RuleContext, RuleResult } from "../rule-engine";
import { AgentInput, ClaimElement, AmbiguityType } from "../../models";

export interface SensitiveTerm {
  term: string;
  source_element_id?: string;
  ambiguity_type: AmbiguityType;
  trigger_reason: string;
}

const FUNCTIONAL_MARKERS = [
  "configured to",
  "adapted to",
  "arranged to",
  "operable to",
  "capable of",
  "for use with",
  "operative to",
  "designed to",
  "suitable for",
];

const VAGUE_RELATIONAL_MARKERS = [
  "substantially",
  "approximately",
  "adjacent",
  "close proximity",
  "proximate to",
  "in communication with",
  "operatively connected",
  "opposite",
  "near",
];

const CONTEXTUAL_MARKERS = [
  "module",
  "mechanism",
  "means for",
  "unit",
  "assembly",
  "component",
  "device",
  "apparatus",
  "system",
  "element",
];

function detectSensitiveTerms(
  elements: ClaimElement[],
  claimText: string,
  disputedTerms: string[],
  disputedNotes: string
): SensitiveTerm[] {
  const terms: SensitiveTerm[] = [];
  const seen = new Set<string>();

  for (const dt of disputedTerms) {
    const normalized = dt.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      terms.push({
        term: dt.trim(),
        ambiguity_type: "disputed_by_user",
        trigger_reason: `Explicitly flagged as disputed by user.`,
      });
    }
  }

  const allTexts = elements.map((e) => ({ text: e.text, id: e.id }));
  if (claimText.trim()) {
    allTexts.push({ text: claimText, id: undefined as unknown as string });
  }

  for (const { text, id } of allTexts) {
    const lower = text.toLowerCase();

    for (const marker of FUNCTIONAL_MARKERS) {
      if (lower.includes(marker) && !seen.has(marker)) {
        seen.add(marker);
        const contextSnippet = extractSnippet(text, marker);
        terms.push({
          term: contextSnippet || marker,
          source_element_id: id,
          ambiguity_type: "functional_term",
          trigger_reason: `Contains functional language "${marker}" which may have broad or narrow scope.`,
        });
      }
    }

    for (const marker of VAGUE_RELATIONAL_MARKERS) {
      if (lower.includes(marker) && !seen.has(marker)) {
        seen.add(marker);
        const contextSnippet = extractSnippet(text, marker);
        terms.push({
          term: contextSnippet || marker,
          source_element_id: id,
          ambiguity_type: "vague_relational",
          trigger_reason: `Contains vague relational term "${marker}" whose scope depends on context.`,
        });
      }
    }

    for (const marker of CONTEXTUAL_MARKERS) {
      const regex = new RegExp(`\\b\\w+\\s+${marker}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) {
        for (const m of matches) {
          const normalized = m.trim().toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            terms.push({
              term: m.trim(),
              source_element_id: id,
              ambiguity_type: "contextual_term",
              trigger_reason: `"${m.trim()}" uses generic structural language ("${marker}") — meaning may depend on specification context.`,
            });
          }
        }
      }
    }
  }

  if (disputedNotes.trim()) {
    for (const elem of elements) {
      const lowerNotes = disputedNotes.toLowerCase();
      const lowerElem = elem.text.toLowerCase();
      const keywords = lowerElem.split(/\s+/).filter((w) => w.length > 4);
      const overlap = keywords.filter((kw) => lowerNotes.includes(kw)).length;

      if (overlap >= 2 && !seen.has(`notes_${elem.id}`)) {
        seen.add(`notes_${elem.id}`);
        const existing = terms.find(
          (t) => t.term.toLowerCase() === lowerElem || t.source_element_id === elem.id
        );
        if (!existing) {
          terms.push({
            term: elem.text,
            source_element_id: elem.id,
            ambiguity_type: "specification_dependent",
            trigger_reason: `Element text overlaps with disputed notes — interpretation may depend on specification.`,
          });
        }
      }
    }
  }

  return terms;
}

function extractSnippet(text: string, marker: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(marker);
  if (idx === -1) return marker;

  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, idx - 15)));
  const end = Math.min(text.length, idx + marker.length + 25);
  const snippet = text.substring(start, end).trim();

  return snippet.length > 60 ? snippet.substring(0, 57) + "..." : snippet;
}

export const sensitivityDetectionRule: Rule = {
  id: "cc_sensitivity_detection",
  name: "Sensitivity Term Detection",
  description:
    "Scans claim text and elements for terms that are potentially ambiguous, " +
    "functional, vague, or context-dependent. Identifies terms needing construction.",

  evaluate(context: RuleContext): RuleResult {
    const input = context.input as AgentInput;
    const claims = input.claims;

    if (!claims) {
      context.cc_sensitive_terms = [];
      return {
        passed: false,
        effect: "no_claims_data",
        reasoning: "No claims data provided. Cannot detect sensitive terms.",
      };
    }

    const elements: ClaimElement[] =
      claims.structured_elements ??
      (claims.claim_elements ?? []).map((text, i) => ({
        id: `elem_${i + 1}`,
        text: text.trim(),
        essential: true,
      }));

    const claimText = claims.claim_text ?? "";
    const disputedNotes = claims.disputed_element_notes ?? "";

    const disputedTerms: string[] = [];
    if (disputedNotes) {
      const quoted = disputedNotes.match(/['']([^'']+)['']/g);
      if (quoted) {
        for (const q of quoted) {
          disputedTerms.push(q.replace(/['']/g, ""));
        }
      }
    }

    const terms = detectSensitiveTerms(elements, claimText, disputedTerms, disputedNotes);

    context.cc_sensitive_terms = terms;
    context.cc_elements = elements;

    if (terms.length === 0) {
      return {
        passed: true,
        effect: "no_sensitivity_detected",
        reasoning:
          "No ambiguous, functional, or context-dependent terms detected in claim language. " +
          "Claim terms appear sufficiently clear for standard matching.",
      };
    }

    const byType: Record<string, number> = {};
    for (const t of terms) {
      byType[t.ambiguity_type] = (byType[t.ambiguity_type] ?? 0) + 1;
    }
    const summary = Object.entries(byType)
      .map(([type, count]) => `${count} ${type.replace(/_/g, " ")}`)
      .join(", ");

    return {
      passed: "uncertain",
      effect: "sensitivity_detected",
      reasoning:
        `Detected ${terms.length} potentially sensitive term(s): ${summary}. ` +
        "These terms may require interpretation to determine scope.",
      triggered_rule: "sensitivity_detection",
    };
  },
};
