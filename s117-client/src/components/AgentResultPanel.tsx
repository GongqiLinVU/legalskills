import {
  AgentOutput,
  SkillOutput,
  SkillStatus,
  Confidence,
  DecisionStep,
  LegalIssue,
  ClaimConstructionResult,
  ConstructionTerm,
  DirectInfringementRawResult,
  ElementModeMatchResult,
  MatchResult,
} from "../types";

interface Props {
  result: AgentOutput;
  onReset: () => void;
}

const STATUS_LABELS: Record<SkillStatus, string> = {
  likely_infringement: "Infringement Likely",
  possible_infringement: "Infringement Possible — Construction-Sensitive",
  unlikely_infringement: "Infringement Unlikely",
  insufficient_information: "Insufficient Information",
  issue_detected: "Issue Identified",
  no_issue_detected: "No Issue Identified",
  not_applicable: "Not Applicable",
};

const STATUS_COLORS: Record<SkillStatus, string> = {
  likely_infringement: "result-badge--red",
  possible_infringement: "result-badge--amber",
  unlikely_infringement: "result-badge--green",
  insufficient_information: "result-badge--grey",
  issue_detected: "result-badge--amber",
  no_issue_detected: "result-badge--green",
  not_applicable: "result-badge--grey",
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High Confidence",
  medium: "Moderate Confidence",
  low: "Low Confidence — Further Analysis Recommended",
};

const ISSUE_LABELS: Record<LegalIssue, string> = {
  s117_indirect_infringement: "Indirect Infringement (s117 Patents Act)",
  direct_infringement: "Direct Infringement",
  validity_novelty: "Validity — Novelty",
  validity_inventive_step: "Validity — Inventive Step",
  claim_construction: "Claim Construction",
  unknown: "Unclassified Issue",
};

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  issue_classifier_skill: "Issue Identification",
  claim_construction_skill: "Claim Construction",
  direct_infringement_skill: "Direct Infringement",
  s117_skill: "s117 Supplier Liability",
};

function formatName(name: string): string {
  if (SKILL_DISPLAY_NAMES[name]) return SKILL_DISPLAY_NAMES[name];
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StepIcon({ result }: { result: boolean | string }) {
  if (result === true) return <span className="step-icon step-icon--yes" />;
  if (result === false) return <span className="step-icon step-icon--no" />;
  return <span className="step-icon step-icon--uncertain" />;
}

const IMPACT_LABELS: Record<string, string> = {
  likely_affects: "Likely to Change Outcome",
  may_affect: "May Affect Outcome",
  unlikely_to_affect: "Unlikely to Affect Outcome",
};

const IMPACT_COLORS: Record<string, string> = {
  likely_affects: "tag--red",
  may_affect: "tag--amber",
  unlikely_to_affect: "tag--green",
};

const AMBIGUITY_LABELS: Record<string, string> = {
  functional_term: "Functional Language",
  vague_relational: "Vague or Relational Term",
  contextual_term: "Context-Dependent Term",
  specification_dependent: "Specification-Dependent",
  disputed_by_user: "Expressly Disputed",
};

function ConstructionTermCard({ term }: { term: ConstructionTerm }) {
  const impactColor = IMPACT_COLORS[term.downstream_impact] ?? "tag--grey";
  return (
    <div className="construction-term-card">
      <div className="construction-term-header">
        <span className="construction-term-name">"{term.term}"</span>
        <span className={`scenario-tag ${impactColor}`}>
          {IMPACT_LABELS[term.downstream_impact] ?? term.downstream_impact}
        </span>
      </div>
      <div className="construction-term-body">
        <div className="construction-term-type">
          <span className="construction-label">Type:</span>{" "}
          {AMBIGUITY_LABELS[term.ambiguity_type] ?? term.ambiguity_type}
        </div>
        <div className="construction-interp">
          <div className="construction-interp-row">
            <span className="construction-label">Broad:</span>{" "}
            <span className="construction-interp-text">{term.broad_interpretation}</span>
          </div>
          <div className="construction-interp-row">
            <span className="construction-label">Narrow:</span>{" "}
            <span className="construction-interp-text">{term.narrow_interpretation}</span>
          </div>
        </div>
        <p className="construction-impact-text">{term.impact}</p>
      </div>
    </div>
  );
}

function ConstructionSection({ raw }: { raw: ClaimConstructionResult }) {
  if (!raw.construction_terms || raw.construction_terms.length === 0) return null;

  return (
    <div className="construction-section">
      <h5 className="skill-steps-title">Terms Requiring Construction</h5>
      <div className="construction-terms-list">
        {raw.construction_terms.map((term, i) => (
          <ConstructionTermCard key={i} term={term} />
        ))}
      </div>
      {raw.downstream_effect && (
        <div className="construction-downstream">
          <span className="construction-label">Impact on Infringement Analysis:</span>{" "}
          {raw.downstream_effect.affects_direct_infringement
            ? "Construction may change the infringement outcome"
            : "Construction unlikely to affect the infringement outcome"}
          {raw.downstream_effect.affects_direct_infringement && (
            <span className="construction-mode-tag">
              {formatName(raw.downstream_effect.recommended_mode)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const MATCH_LABELS: Record<MatchResult, string> = {
  matched: "Present",
  not_matched: "Not Present",
  uncertain: "Uncertain",
};

const MATCH_COLORS: Record<MatchResult, string> = {
  matched: "match-badge--green",
  not_matched: "match-badge--red",
  uncertain: "match-badge--amber",
};

function ElementModeCard({ element }: { element: ElementModeMatchResult }) {
  const isDivergent = element.broad_match !== element.narrow_match;

  return (
    <div className={`element-mode-card${isDivergent ? " element-mode-card--divergent" : ""}`}>
      <div className="element-mode-header">
        <span className="element-mode-id">{element.element_id}</span>
        <span className="element-mode-text">{element.element_text}</span>
        {element.affected_by_construction && (
          <span className="scenario-tag tag--amber">Construction-Sensitive</span>
        )}
        {isDivergent && (
          <span className="scenario-tag tag--red">Outcome Differs by Construction</span>
        )}
      </div>
      <div className="element-mode-body">
        {element.affected_by_construction && element.affecting_terms.length > 0 && (
          <div className="element-mode-terms">
            <span className="construction-label">Affected by:</span>{" "}
            {element.affecting_terms.map((t) => `"${t}"`).join(", ")}
          </div>
        )}
        <div className="element-mode-matches">
          <div className="element-mode-match-row">
            <span className="element-mode-match-label">Baseline:</span>
            <span className={`match-badge ${MATCH_COLORS[element.baseline_match]}`}>
              {MATCH_LABELS[element.baseline_match]}
            </span>
          </div>
          <div className="element-mode-match-row">
            <span className="element-mode-match-label">Broad:</span>
            <span className={`match-badge ${MATCH_COLORS[element.broad_match]}`}>
              {MATCH_LABELS[element.broad_match]}
            </span>
            {element.affected_by_construction && (
              <span className="element-mode-reasoning">{element.reasoning.broad}</span>
            )}
          </div>
          <div className="element-mode-match-row">
            <span className="element-mode-match-label">Narrow:</span>
            <span className={`match-badge ${MATCH_COLORS[element.narrow_match]}`}>
              {MATCH_LABELS[element.narrow_match]}
            </span>
            {element.affected_by_construction && (
              <span className="element-mode-reasoning">{element.reasoning.narrow}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DIConstructionSensitiveSection({ raw }: { raw: DirectInfringementRawResult }) {
  if (!raw.interpretation_sensitive) return null;

  const hasElementModeResults = raw.element_mode_results && raw.element_mode_results.length > 0;
  const hasOutcomeProfile = raw.outcome_profile;
  const hasDivergence = raw.divergence;

  return (
    <div className="di-construction-section">
      <h5 className="skill-steps-title">Construction-Sensitive Analysis</h5>
      <div className="di-construction-banner">
        {hasDivergence?.is_divergent
          ? "The infringement outcome depends on how the disputed claim terms are construed. Broad and narrow constructions produce different results."
          : "The analysis has considered both broad and narrow constructions of the disputed claim terms."}
      </div>

      {hasDivergence && (
        <div className="di-divergence-summary">
          <span className="construction-label">Construction Impact:</span>{" "}
          {hasDivergence.summary}
        </div>
      )}

      {hasOutcomeProfile && (
        <div className="di-broad-narrow">
          <div className="di-view-row">
            <span className="di-view-label">Broad construction:</span>
            <span className={`skill-result-badge ${STATUS_COLORS[hasOutcomeProfile.broad_view as SkillStatus] ?? "result-badge--grey"}`}>
              {STATUS_LABELS[hasOutcomeProfile.broad_view as SkillStatus] ?? hasOutcomeProfile.broad_view}
            </span>
          </div>
          <div className="di-view-row">
            <span className="di-view-label">Narrow construction:</span>
            <span className={`skill-result-badge ${STATUS_COLORS[hasOutcomeProfile.narrow_view as SkillStatus] ?? "result-badge--grey"}`}>
              {STATUS_LABELS[hasOutcomeProfile.narrow_view as SkillStatus] ?? hasOutcomeProfile.narrow_view}
            </span>
          </div>
        </div>
      )}

      {!hasOutcomeProfile && raw.outcome_under_broad_view && raw.outcome_under_narrow_view && (
        <div className="di-broad-narrow">
          <div className="di-view-row">
            <span className="di-view-label">Broad construction:</span>
            <span className={`skill-result-badge ${STATUS_COLORS[raw.outcome_under_broad_view as SkillStatus] ?? "result-badge--grey"}`}>
              {STATUS_LABELS[raw.outcome_under_broad_view as SkillStatus] ?? raw.outcome_under_broad_view}
            </span>
          </div>
          <div className="di-view-row">
            <span className="di-view-label">Narrow construction:</span>
            <span className={`skill-result-badge ${STATUS_COLORS[raw.outcome_under_narrow_view as SkillStatus] ?? "result-badge--grey"}`}>
              {STATUS_LABELS[raw.outcome_under_narrow_view as SkillStatus] ?? raw.outcome_under_narrow_view}
            </span>
          </div>
        </div>
      )}

      {hasElementModeResults && (
        <div className="di-element-mode-section">
          <h5 className="skill-steps-title">Integer-by-Integer Analysis</h5>
          <div className="element-mode-list">
            {raw.element_mode_results!.map((elem) => (
              <ElementModeCard key={elem.element_id} element={elem} />
            ))}
          </div>
        </div>
      )}

      {!hasElementModeResults && raw.affected_elements && raw.affected_elements.length > 0 && (
        <div className="di-affected-elements">
          <span className="construction-label">Affected Elements:</span>{" "}
          {raw.affected_elements.join(", ")}
        </div>
      )}
    </div>
  );
}

function SkillResultCard({ skill }: { skill: SkillOutput }) {
  const statusColor = STATUS_COLORS[skill.status] ?? "result-badge--grey";
  const isClassifier = skill.skill === "issue_classifier_skill";
  const isCC = skill.skill === "claim_construction_skill";
  const isDI = skill.skill === "direct_infringement_skill";

  const ccRaw = isCC ? (skill.raw_result as ClaimConstructionResult | undefined) : undefined;
  const diRaw = isDI ? (skill.raw_result as DirectInfringementRawResult | undefined) : undefined;

  return (
    <div className={`skill-result-card${isCC && ccRaw?.result === "interpretation_sensitive" ? " skill-result-card--sensitive" : ""}${isDI && diRaw?.interpretation_sensitive ? " skill-result-card--sensitive" : ""}`}>
      <div className="skill-result-header">
        <span className="skill-result-name">{formatName(skill.skill)}</span>
        <span className={`skill-result-badge ${statusColor}`}>
          {STATUS_LABELS[skill.status] ?? skill.status}
        </span>
        <span className="skill-result-confidence">
          {CONFIDENCE_LABELS[skill.confidence]}
        </span>
      </div>

      <div className="skill-result-body">
        <p className="skill-result-explanation">{skill.explanation}</p>

        {ccRaw && <ConstructionSection raw={ccRaw} />}

        {diRaw && <DIConstructionSensitiveSection raw={diRaw} />}

        {skill.decision_path.length > 0 && (
          <div className="skill-steps">
            <h5 className="skill-steps-title">
              {isClassifier ? "Issues Identified" : "Reasoning Steps"}
            </h5>
            {skill.decision_path.map((step: DecisionStep, i: number) => (
              <div key={i} className="step-card">
                <div className="step-card-header">
                  <span className="step-number">
                    {isClassifier ? `Issue ${i + 1}` : `Stage ${i + 1}`}
                  </span>
                  <span className="step-name">{formatName(step.step)}</span>
                  <StepIcon result={step.result} />
                </div>
                <div className="step-card-body">
                  <div className="step-effect">
                    <span className="step-effect-label">Effect:</span>{" "}
                    {step.effect.replace(/_/g, " ")}
                  </div>
                  <p className="step-reasoning">{step.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {skill.warnings.length > 0 && (
          <div className="skill-warnings">
            <ul className="warnings-list">
              {skill.warnings.map((w, i) => (
                <li key={i} className="warning-item">{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentResultPanel({ result, onReset }: Props) {
  const overallColor =
    STATUS_COLORS[result.overall_result.status] ?? "result-badge--grey";

  const suggestedNextSkills = result.suggested_next_skills ?? [];

  return (
    <div className="result-panel">
      <div className="result-header">
        <h2>Preliminary Assessment</h2>
        <button className="btn btn--secondary" onClick={onReset}>
          New Assessment
        </button>
      </div>

      <div className="result-summary">
        <div className={`result-badge ${overallColor}`}>
          {STATUS_LABELS[result.overall_result.status] ??
            result.overall_result.status}
        </div>
        <div className="result-confidence">
          {CONFIDENCE_LABELS[result.overall_result.confidence]}
        </div>
      </div>

      <div className="result-section">
        <h3>Legal Issues Identified</h3>
        <div className="issue-tags">
          {result.detected_issues.map((issue) => (
            <span key={issue} className="issue-tag">
              {ISSUE_LABELS[issue] ?? issue}
            </span>
          ))}
          {result.detected_issues.length === 0 && (
            <span className="issue-tag issue-tag--none">
              No issues identified
            </span>
          )}
        </div>
      </div>

      <div className="result-section">
        <h3>Analysis Performed</h3>
        <div className="skill-pipeline">
          {result.selected_skills.map((name, i) => (
            <span key={name} className="pipeline-skill">
              {i > 0 && <span className="pipeline-arrow" />}
              {formatName(name)}
            </span>
          ))}
        </div>
      </div>

      <div className="result-section">
        <h3>Summary</h3>
        <p className="explanation-text">{result.explanation}</p>
      </div>

      <div className="result-section">
        <h3>Detailed Analysis</h3>
        <div className="skill-results-list">
          {result.skill_results.map((skill) => (
            <SkillResultCard key={skill.skill} skill={skill} />
          ))}
        </div>
      </div>

      {suggestedNextSkills.length > 0 && (
        <div className="result-section">
          <h3>Further Analysis Recommended</h3>
          <div className="suggested-skills">
            {suggestedNextSkills.map((name) => (
              <span key={name} className="suggested-skill-tag">
                {formatName(name)}
              </span>
            ))}
          </div>
          <p className="suggested-skills-note">
            The following areas of analysis are recommended but may not yet
            be available in this version.
          </p>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="result-section">
          <h3>Caveats &amp; Limitations</h3>
          <ul className="warnings-list">
            {result.warnings.map((w, i) => (
              <li key={i} className="warning-item">{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
