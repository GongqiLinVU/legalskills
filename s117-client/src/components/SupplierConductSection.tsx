import { SupplierConduct } from "../types";
import { TriStateSelect } from "./TriStateSelect";

interface Props {
  value: SupplierConduct;
  onChange: (value: SupplierConduct) => void;
}

export function SupplierConductSection({ value, onChange }: Props) {
  return (
    <fieldset className="form-section">
      <legend>Supplier Conduct</legend>
      <p className="section-desc">
        Assess the supplier's state of mind and actions. These factors determine
        whether the supplier can be held liable for indirect infringement even
        when supplying a non-staple product, or can override the staple
        gatekeeper.
      </p>

      <div className="subsection">
        <h4 className="subsection-title">Knowledge / Reason to Believe</h4>

        <TriStateSelect
          label="Did the supplier have reason to believe the product would be used to infringe?"
          value={value.has_reason_to_believe}
          onChange={(v) => onChange({ ...value, has_reason_to_believe: v })}
          helpText="Consider: Was the supplier a former licensee? Were they sent a cease-and-desist letter? Did they have knowledge of the patent?"
        />

        <div className="field">
          <label className="field-label">Details</label>
          <textarea
            className="text-input textarea"
            placeholder="Describe any evidence of the supplier's knowledge..."
            rows={2}
            value={value.reason_to_believe_details ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                reason_to_believe_details: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="subsection">
        <h4 className="subsection-title">Instructions for Infringing Use</h4>

        <TriStateSelect
          label="Did the supplier provide instructions directing toward infringing use?"
          value={value.provided_instructions_for_infringing_use}
          onChange={(v) =>
            onChange({
              ...value,
              provided_instructions_for_infringing_use: v,
            })
          }
          helpText="Consider: Does the product manual describe the patented method? Do installation instructions replicate the patented process?"
        />

        <div className="field">
          <label className="field-label">Details</label>
          <textarea
            className="text-input textarea"
            placeholder="Describe the nature of the instructions..."
            rows={2}
            value={value.instructions_details ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                instructions_details: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="subsection">
        <h4 className="subsection-title">
          Inducement / Advertisement
        </h4>

        <TriStateSelect
          label="Did the supplier induce or advertise the product for infringing use?"
          value={value.induced_or_advertised_infringing_use}
          onChange={(v) =>
            onChange({
              ...value,
              induced_or_advertised_infringing_use: v,
            })
          }
          helpText="Consider: Marketing materials referencing the patented system, trade show demonstrations, promotional claims about compatibility."
        />

        <div className="field">
          <label className="field-label">Details</label>
          <textarea
            className="text-input textarea"
            placeholder="Describe inducement or advertising evidence..."
            rows={2}
            value={value.inducement_details ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                inducement_details: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>
    </fieldset>
  );
}
