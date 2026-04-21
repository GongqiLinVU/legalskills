import { S117EvaluationResult, DecisionStep, LikelyResult, Confidence } from "../types";

interface Props {
  result: S117EvaluationResult;
  onReset: () => void;
}

const RESULT_LABELS: Record<LikelyResult, string> = {
  likely_infringement: "Likely Infringement",
  possible_infringement: "Possible Infringement",
  unlikely_infringement: "Unlikely Infringement",
  insufficient_information: "Insufficient Information",
};

const RESULT_COLORS: Record<LikelyResult, string> = {
  likely_infringement: "result-badge--red",
  possible_infringement: "result-badge--amber",
  unlikely_infringement: "result-badge--green",
  insufficient_information: "result-badge--grey",
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

function StepIcon({ result }: { result: boolean | string }) {
  if (result === true) return <span className="step-icon step-icon--yes" />;
  if (result === false) return <span className="step-icon step-icon--no" />;
  return <span className="step-icon step-icon--uncertain" />;
}

function formatStepName(step: string): string {
  return step
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEffect(effect: string): string {
  return effect.replace(/_/g, " ");
}

function DecisionStepCard({ step, index }: { step: DecisionStep; index: number }) {
  return (
    <div className="step-card">
      <div className="step-card-header">
        <span className="step-number">Stage {index + 1}</span>
        <span className="step-name">{formatStepName(step.step)}</span>
        <StepIcon result={step.result} />
      </div>
      <div className="step-card-body">
        <div className="step-effect">
          <span className="step-effect-label">Effect:</span>{" "}
          {formatEffect(step.effect)}
        </div>
        <p className="step-reasoning">{step.reasoning}</p>
      </div>
    </div>
  );
}

export function ResultPanel({ result, onReset }: Props) {
  return (
    <div className="result-panel">
      <div className="result-header">
        <h2>Assessment Result</h2>
        <button className="btn btn--secondary" onClick={onReset}>
          New Assessment
        </button>
      </div>

      <div className="result-summary">
        <div
          className={`result-badge ${RESULT_COLORS[result.likely_result]}`}
        >
          {RESULT_LABELS[result.likely_result]}
        </div>
        <div className="result-confidence">
          {CONFIDENCE_LABELS[result.confidence]}
        </div>
      </div>

      <div className="result-section">
        <h3>Explanation</h3>
        <p className="explanation-text">{result.explanation}</p>
      </div>

      <div className="result-section">
        <h3>Decision Trace</h3>
        <div className="steps-timeline">
          {result.decision_path.map((step, i) => (
            <DecisionStepCard key={step.step} step={step} index={i} />
          ))}
        </div>
      </div>

      {result.triggered_rules.length > 0 && (
        <div className="result-section">
          <h3>Triggered Rules</h3>
          <ul className="rules-list">
            {result.triggered_rules.map((rule, i) => (
              <li key={i} className="rule-item">
                <code>{rule}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="result-section">
        <h3>Warnings &amp; Disclaimers</h3>
        <ul className="warnings-list">
          {result.warnings.map((w, i) => (
            <li key={i} className="warning-item">{w}</li>
          ))}
        </ul>
      </div>

      {!result.input_quality.complete && (
        <div className="result-section">
          <h3>Input Quality</h3>
          <p className="input-quality-note">
            Some fields were missing or uncertain, which may have affected the
            assessment:
          </p>
          {result.input_quality.missing_fields.length > 0 && (
            <p>
              <strong>Missing:</strong>{" "}
              {result.input_quality.missing_fields.join(", ")}
            </p>
          )}
          {result.input_quality.uncertain_fields.length > 0 && (
            <p>
              <strong>Uncertain:</strong>{" "}
              {result.input_quality.uncertain_fields.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
