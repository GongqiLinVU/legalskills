import { EvidenceFlags } from "../types";

interface Props {
  value: EvidenceFlags;
  onChange: (value: EvidenceFlags) => void;
}

export function EvidenceFlagsSection({ value, onChange }: Props) {
  return (
    <fieldset className="form-section">
      <legend>Available Evidence</legend>
      <p className="section-desc">
        Indicate what types of evidence are available. This affects the
        confidence level of the assessment.
      </p>

      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.has_expert_evidence}
            onChange={(e) =>
              onChange({ ...value, has_expert_evidence: e.target.checked })
            }
          />
          Expert evidence available
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.has_documentary_evidence}
            onChange={(e) =>
              onChange({
                ...value,
                has_documentary_evidence: e.target.checked,
              })
            }
          />
          Documentary evidence available
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.has_advertising_evidence}
            onChange={(e) =>
              onChange({
                ...value,
                has_advertising_evidence: e.target.checked,
              })
            }
          />
          Advertising evidence available
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.has_customer_testimony}
            onChange={(e) =>
              onChange({
                ...value,
                has_customer_testimony: e.target.checked,
              })
            }
          />
          Customer testimony available
        </label>
      </div>

      <div className="field">
        <label className="field-label">Evidence Notes</label>
        <textarea
          className="text-input textarea"
          placeholder="Any additional notes about the evidence available..."
          rows={2}
          value={value.evidence_notes ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              evidence_notes: e.target.value || undefined,
            })
          }
        />
      </div>
    </fieldset>
  );
}
