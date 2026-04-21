import { TriState } from "../types";

interface Props {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
  helpText?: string;
}

export function TriStateSelect({ label, value, onChange, helpText }: Props) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="tri-state-group">
        {(["true", "false", "uncertain"] as TriState[]).map((opt) => (
          <button
            key={opt}
            type="button"
            className={`tri-btn tri-btn--${opt} ${value === opt ? "active" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt === "true" ? "Yes" : opt === "false" ? "No" : "Uncertain"}
          </button>
        ))}
      </div>
      {helpText && <p className="field-help">{helpText}</p>}
    </div>
  );
}
