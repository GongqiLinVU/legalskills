import { useState } from "react";
import { TestScenario } from "../types/scenario";
import scenarios from "../data/test-scenarios.json";

const RESULT_TAG: Record<string, { label: string; className: string }> = {
  likely_infringement: { label: "Likely", className: "tag--red" },
  possible_infringement: { label: "Possible", className: "tag--amber" },
  unlikely_infringement: { label: "Unlikely", className: "tag--green" },
  insufficient_information: { label: "Insufficient", className: "tag--grey" },
};

interface Props {
  onSelect: (data: Record<string, unknown>) => void;
}

export function ScenarioSelector({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const typed = scenarios as TestScenario[];

  function handleSelect(scenario: TestScenario) {
    setSelected(scenario.id);
    setOpen(false);
    onSelect(scenario.data);
  }

  const current = typed.find((s) => s.id === selected);

  return (
    <div className="scenario-selector">
      <label className="scenario-label">Load Test Scenario</label>
      <div className="scenario-dropdown-wrap">
        <button
          type="button"
          className="scenario-trigger"
          onClick={() => setOpen(!open)}
        >
          <span className="scenario-trigger-text">
            {current ? current.name : "Select a test scenario..."}
          </span>
          <span className={`scenario-arrow ${open ? "open" : ""}`} />
        </button>

        {open && (
          <ul className="scenario-menu">
            {typed.map((s) => {
              const tag = RESULT_TAG[s.expected_result];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`scenario-item ${selected === s.id ? "active" : ""}`}
                    onClick={() => handleSelect(s)}
                  >
                    <div className="scenario-item-top">
                      <span className="scenario-item-name">{s.name}</span>
                      {tag && (
                        <span className={`scenario-tag ${tag.className}`}>
                          {tag.label}
                        </span>
                      )}
                    </div>
                    <p className="scenario-item-desc">{s.description}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
