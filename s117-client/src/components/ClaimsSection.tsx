import { ClaimInfo } from "../types";

interface Props {
  value: ClaimInfo;
  onChange: (value: ClaimInfo) => void;
}

export function ClaimsSection({ value, onChange }: Props) {
  function handleElementsChange(raw: string) {
    const elements = raw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onChange({ ...value, claim_elements: elements.length > 0 ? elements : undefined });
  }

  return (
    <fieldset className="form-section">
      <legend>Direct Infringement — Claim Analysis</legend>
      <p className="section-desc">
        Provide claim details and accused product description for element-by-element
        infringement comparison. These fields are used by the direct infringement skill.
      </p>

      <div className="field">
        <label className="field-label">Accused Product Description</label>
        <textarea
          className="text-input textarea"
          rows={3}
          placeholder="Describe the accused product or conduct and how it operates..."
          value={value.accused_product_description ?? ""}
          onChange={(e) =>
            onChange({ ...value, accused_product_description: e.target.value || undefined })
          }
        />
        <p className="field-help">
          Describe the product or process alleged to infringe the patent claims.
        </p>
      </div>

      <div className="field">
        <label className="field-label">Claim Elements (one per line)</label>
        <textarea
          className="text-input textarea"
          rows={4}
          placeholder={"soil moisture sensor\nwireless communication module\nadaptive watering algorithm"}
          value={(value.claim_elements ?? []).join("\n")}
          onChange={(e) => handleElementsChange(e.target.value)}
        />
        <p className="field-help">
          List each claim element on a separate line. If omitted, the system will attempt
          to parse elements from the claim description in Patent Context.
        </p>
      </div>

      <div className="field">
        <label className="field-label">Disputed Element Notes</label>
        <textarea
          className="text-input textarea"
          rows={2}
          placeholder="Note any elements whose claim language is ambiguous or disputed..."
          value={value.disputed_element_notes ?? ""}
          onChange={(e) =>
            onChange({ ...value, disputed_element_notes: e.target.value || undefined })
          }
        />
      </div>

      <div className="field">
        <label className="field-label">Specification / Context Notes</label>
        <textarea
          className="text-input textarea"
          rows={2}
          placeholder="Optional notes about the patent specification that may narrow claim interpretation..."
          value={value.specification_notes ?? ""}
          onChange={(e) =>
            onChange({ ...value, specification_notes: e.target.value || undefined })
          }
        />
        <p className="field-help">
          If the patent specification provides context that may affect how claim terms
          should be interpreted, note it here. Used by the claim construction skill.
        </p>
      </div>

      <div className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.claim_construction_disputed ?? false}
            onChange={(e) =>
              onChange({ ...value, claim_construction_disputed: e.target.checked || undefined })
            }
          />
          Claim construction is disputed
        </label>
        <p className="field-help">
          Check if the meaning of claim terms is contested. This triggers the claim
          construction skill which analyses ambiguous terms and their impact on
          infringement analysis.
        </p>
      </div>
    </fieldset>
  );
}
