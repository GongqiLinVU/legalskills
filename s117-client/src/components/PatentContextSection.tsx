import { PatentContext } from "../types";

interface Props {
  value: PatentContext;
  onChange: (value: PatentContext) => void;
}

export function PatentContextSection({ value, onChange }: Props) {
  return (
    <fieldset className="form-section">
      <legend>Patent Context</legend>
      <p className="section-desc">
        Background information about the patent in question. Optional but helps
        contextualise the analysis.
      </p>

      <div className="field">
        <label className="field-label">Patent Number</label>
        <input
          type="text"
          className="text-input"
          placeholder="e.g. AU2020100001"
          value={value.patent_number ?? ""}
          onChange={(e) =>
            onChange({ ...value, patent_number: e.target.value || undefined })
          }
        />
      </div>

      <div className="field">
        <label className="field-label">Patent Title</label>
        <input
          type="text"
          className="text-input"
          placeholder="e.g. Improved fastening mechanism for modular panels"
          value={value.patent_title ?? ""}
          onChange={(e) =>
            onChange({ ...value, patent_title: e.target.value || undefined })
          }
        />
      </div>

      <div className="field">
        <label className="field-label">
          Relevant Claims (comma-separated)
        </label>
        <input
          type="text"
          className="text-input"
          placeholder="e.g. 1, 3, 5"
          value={(value.relevant_claims ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...value,
              relevant_claims: e.target.value
                ? e.target.value.split(",").map((s) => s.trim())
                : undefined,
            })
          }
        />
      </div>

      <div className="field">
        <label className="field-label">Claim Description</label>
        <textarea
          className="text-input textarea"
          placeholder="Brief description of what the relevant claims cover..."
          rows={3}
          value={value.claim_description ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              claim_description: e.target.value || undefined,
            })
          }
        />
      </div>
    </fieldset>
  );
}
