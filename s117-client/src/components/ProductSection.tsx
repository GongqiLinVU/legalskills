import { ProductInfo } from "../types";
import { TriStateSelect } from "./TriStateSelect";

interface Props {
  value: ProductInfo;
  onChange: (value: ProductInfo) => void;
}

export function ProductSection({ value, onChange }: Props) {
  return (
    <fieldset className="form-section">
      <legend>Product Information</legend>
      <p className="section-desc">
        Describe the product being supplied. The staple commercial product
        question is the key gatekeeper in s117 analysis.
      </p>

      <div className="field">
        <label className="field-label">
          Product Name <span className="required">*</span>
        </label>
        <input
          type="text"
          className="text-input"
          placeholder="e.g. Standard metal clips (box of 500)"
          value={value.product_name}
          onChange={(e) => onChange({ ...value, product_name: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="field-label">Product Description</label>
        <textarea
          className="text-input textarea"
          placeholder="Describe the product, its uses, and its market context..."
          rows={3}
          value={value.product_description ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              product_description: e.target.value || undefined,
            })
          }
        />
      </div>

      <TriStateSelect
        label="Is this a staple commercial product?"
        value={value.is_staple_commercial_product}
        onChange={(v) =>
          onChange({ ...value, is_staple_commercial_product: v })
        }
        helpText="A staple commercial product is one that is widely available, has substantial non-infringing uses, and is not specially adapted for the patented invention. This is the primary gatekeeper for s117."
      />

      <div className="field">
        <label className="field-label">Reasoning for Staple Assessment</label>
        <textarea
          className="text-input textarea"
          placeholder="Explain why you believe the product is or is not a staple commercial product..."
          rows={2}
          value={value.staple_reasoning ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              staple_reasoning: e.target.value || undefined,
            })
          }
        />
      </div>

      <TriStateSelect
        label="Does the product have substantial non-infringing uses?"
        value={value.has_non_infringing_uses}
        onChange={(v) => onChange({ ...value, has_non_infringing_uses: v })}
      />
    </fieldset>
  );
}
