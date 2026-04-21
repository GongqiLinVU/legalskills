# Legal Decision Agent v0.5.0

A **multi-skill legal decision agent** for Australian patent law. The system receives a legal problem, identifies relevant issues, selects and executes the appropriate legal reasoning skills, and returns a structured, explainable decision report.

> **Disclaimer:** This is a prototype legal reasoning system, not legal advice. It is intended for research, education, and proof-of-concept purposes only.

---

## What Changed in v0.5.0 (Stage 3.5 — Construction-Driven Direct Infringement)

**v0.4.0** introduced claim construction as an upstream context provider — it detected sensitive terms and passed them to direct infringement, but broad/narrow outcomes were derived from presentation-layer logic (treating uncertain elements as matched/not-matched after the fact).

**v0.5.0** makes claim construction actually **drive** the direct infringement matching engine. The DI pipeline now performs separate broad-mode and narrow-mode element matching, and result divergence emerges from the matching logic itself.

| Change | Description |
|--------|-------------|
| **Construction Map** | Claim construction now outputs a structured `ConstructionMap` with per-term `mode_effects` (matching style + note for broad and narrow modes) |
| **Construction-Driven Matching** | DI pipeline extended from 5 stages to 9 stages — new rules for dependency mapping, broad-mode matching, narrow-mode matching, and divergence synthesis |
| **Element-Level Sensitivity** | Each element now carries `ElementModeMatchResult` showing baseline/broad/narrow match, affecting terms, and per-mode reasoning |
| **Outcome Profile** | DI result includes `DirectInfringementOutcomeProfile` with `broad_view`, `narrow_view`, and `divergence` flag |
| **Divergence Assessment** | `DivergenceAssessment` identifies stable vs. divergent elements with a summary explanation |
| **Construction-Driven Synthesis** | Result synthesizer produces consolidated explanation: which terms created sensitivity, which elements changed, whether liability is stable or interpretation-sensitive |
| **4 New Scenarios** | Stable under both modes, divergent outcome, divergent + insufficient, mixed DI diverge + s117 strong |
| **UI Upgrade** | Element-level broad/narrow breakdown cards, divergence summary, outcome profile badges |

All existing scenarios and the legacy s117 endpoint remain **fully backward-compatible**.

---

## What Construction-Driven Matching Means

In v0.4.0, broad/narrow outcomes were computed after element matching by applying simple assumptions (uncertain → matched for broad, uncertain → not-matched for narrow). The matching engine itself did not change behaviour based on construction context.

In v0.5.0, the DI pipeline explicitly:

1. **Maps construction dependencies** — identifies which elements are affected by which construction terms (Stage 3)
2. **Performs broad-mode matching** — re-evaluates affected elements using the broad matching style from the construction map (Stage 4)
3. **Performs narrow-mode matching** — re-evaluates affected elements using the narrow matching style (Stage 5)
4. **Synthesizes divergence** — compares broad and narrow results per-element and per-outcome to determine stability (Stage 6)

### How Broad/Narrow Modes Affect DI

**Broad mode** matching styles:
- `functional_equivalent_allowed` — any component performing the stated function may satisfy the term
- `role_based_inclusive` — any structural/functional equivalent fulfilling the stated role qualifies
- `loose_relational` — interpreted without strict spatial/temporal/quantitative limits

Broad mode upgrades uncertain elements to matched when functional overlap is detected, and upgrades not-matched elements to uncertain when partial overlap exists.

**Narrow mode** matching styles:
- `dedicated_structure_required` — requires a distinct structure consistent with the specification
- `specification_anchored` — only the specific implementation described in the patent qualifies
- `strict_relational` — interpreted with reference to specific specification parameters

Narrow mode downgrades uncertain elements to not-matched and may downgrade keyword-matched elements to uncertain when overlap is insufficient for the stricter standard. Explicit user-confirmed matches are preserved.

### How Element-Level Sensitivity Is Tracked

Each element in the DI result carries an `ElementModeMatchResult`:

```json
{
  "element_id": "e3",
  "element_text": "biometric authentication module adapted to verify user identity",
  "essential": true,
  "affected_by_construction": true,
  "affecting_terms": ["biometric authentication module"],
  "baseline_match": "uncertain",
  "broad_match": "matched",
  "narrow_match": "not_matched",
  "reasoning": {
    "baseline": "Mapping provided but inconclusive...",
    "broad": "Under broad reading, uncertain element treated as matched...",
    "narrow": "Under narrow reading, uncertain element treated as not matched..."
  }
}
```

### How Divergence Is Synthesized

The divergence synthesis rule compares outcomes:

- **Stable result**: same outcome under broad and narrow (e.g., both yield likely infringement)
- **Divergent result**: different outcomes (e.g., broad → likely infringement, narrow → unlikely infringement)
- **Element-level divergence with stable outcome**: individual elements differ but overall result is the same

```json
{
  "outcome_profile": {
    "broad_view": "likely_infringement",
    "narrow_view": "unlikely_infringement",
    "divergence": true
  },
  "divergence": {
    "is_divergent": true,
    "stable_elements": ["e1", "e2"],
    "divergent_elements": ["e3", "e4"],
    "summary": "Outcomes diverge: broad view yields likely infringement, narrow view yields unlikely infringement. 2 element(s) changed between modes: e3, e4."
  }
}
```

---

## Architecture

```
                  ┌─────────────────────────────────┐
                  │      POST /api/agent/evaluate    │
                  └─────────────┬───────────────────┘
                                │
                  ┌─────────────▼───────────────────┐
                  │         Orchestrator             │
                  │   (agent/orchestrator.ts)        │
                  └─────────────┬───────────────────┘
                                │
              ┌─────────────────┼─────────────────────┐
              ▼                 ▼                      ▼
   ┌──────────────────┐  ┌───────────┐  ┌──────────────────┐
   │ Issue Classifier  │  │  Planner  │  │ Result Synthesizer│
   │ (detect issues)   │  │ (select & │  │ (combine outputs) │
   │                   │  │  order)   │  │ +CC-driven synth. │
   └──────────────────┘  └─────┬─────┘  └──────────────────┘
                                │
                  ┌─────────────▼───────────────────┐
                  │        Skill Registry            │
                  └─────────────┬───────────────────┘
                                │
              ┌────────┬────────┼──────────── ─ ─ ─ ─ ─ ┐
              ▼        ▼        ▼          (future skills)
   ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐
   │ Claim Const. │ │ Direct Infr. │ │    s117 Skill    │
   │ Skill        │─│ Skill        │ │  (indirect)      │
   │ +Constr.Map  │ │ +Mode Engine │ │                  │
   └──────┬──────┘ └──────┬──────┘ └────────┬─────────┘
          │ constr.map    │                  │
          └───────────────┘                  │
```

### Execution Flow

1. **Input** arrives at `/api/agent/evaluate` with case data
2. **Issue Classifier** inspects input fields and identifies legal issues
3. **Planner** selects skills and orders them by priority
4. **Orchestrator** executes skills in order, passing construction map from CC to DI
5. **Result Synthesizer** combines outputs, including construction-driven explanation

### Skill Execution Ordering

| Priority | Skill | Rationale |
|----------|-------|-----------|
| 1 | `claim_construction_skill` | Produces construction map before element matching |
| 2 | `direct_infringement_skill` | Uses construction map for mode-sensitive matching |
| 3 | `s117_skill` | Evaluates supplier liability for indirect infringement |

---

## Direct Infringement Skill — Construction-Driven Pipeline

### Rule Pipeline (9 stages)

| Stage | Rule | Purpose |
|-------|------|---------|
| 1 | Input Quality Check | Validates presence of claim and accused product data |
| 2 | Element Extraction | Extracts claim elements from structured input, string list, or heuristic parsing |
| 3 | Element Matching | Baseline element-by-element comparison (keyword overlap, explicit mapping, disputed notes) |
| 4 | **Construction Dependency Mapping** | Maps which elements are affected by which construction terms |
| 5 | **Broad-Mode Matching** | Re-evaluates affected elements under broad interpretation |
| 6 | **Narrow-Mode Matching** | Re-evaluates affected elements under narrow interpretation |
| 7 | **Divergence Synthesis** | Compares broad/narrow results, produces outcome profile and divergence assessment |
| 8 | All-Elements Determination | Applies the all-elements rule |
| 9 | Claim Interpretation Sensitivity | Detects wording-dependent uncertainty |

Stages 4–7 are new in v0.5.0. They only activate when a construction map is present.

---

## Claim Construction Skill

### What It Does

1. **Identifies sensitive terms** — scans claim text and elements for ambiguous, functional, vague, or context-dependent wording
2. **Generates candidate interpretations** — produces broad and narrow readings for each sensitive term
3. **Assesses downstream impact** — determines whether interpretation issues are likely to affect DI
4. **Builds construction map** — produces a structured `ConstructionMap` with per-term `mode_effects` linking terms to affected elements and matching style instructions

### Construction Map Format

```json
{
  "construction_map": {
    "construction_terms": [
      {
        "term": "wireless communication module",
        "ambiguity_type": "contextual_term",
        "affects_elements": ["e4"],
        "mode_effects": {
          "broad": {
            "matching_style": "role_based_inclusive",
            "matching_note": "Any structural or functional equivalent fulfilling the stated role satisfies this term."
          },
          "narrow": {
            "matching_style": "specification_anchored",
            "matching_note": "Only the specific implementation described in the patent specification satisfies this term."
          }
        }
      }
    ],
    "has_material_divergence": true
  }
}
```

### Sensitivity Detection

| Type | Examples | Detection |
|------|----------|-----------|
| **Functional terms** | "configured to", "adapted to", "arranged to", "operable to" | Keyword matching |
| **Vague relational** | "substantially", "adjacent", "close proximity", "in communication with" | Keyword matching |
| **Contextual terms** | "module", "mechanism", "means for", "unit", "assembly" | Pattern matching |
| **Specification dependent** | Terms overlapping with disputed notes | Keyword overlap |
| **Disputed by user** | Terms in quoted strings within disputed notes | Explicit user flag |

---

## Project Structure

```
src/
├── index.ts                             # Express app + skill registration
├── agent/
│   ├── orchestrator.ts                  # Passes construction map from CC to DI
│   ├── planner.ts                       # Skill selection + ordering
│   ├── skill-registry.ts               # Skill registration and lookup
│   └── issue-detector.ts               # Wraps issue classifier
├── skills/
│   ├── issue-classifier-skill.ts       # Heuristic issue detection
│   ├── claim-construction-skill.ts     # Upstream interpretation + construction map
│   ├── direct-infringement-skill.ts    # Construction-driven element matching
│   ├── s117-skill.ts                   # Wraps s117 rule engine
│   └── synthesis/
│       └── result-synthesizer.ts       # Combines outputs + CC-driven synthesis
├── rules/
│   ├── rule-engine.ts                  # Generic Rule interface + pipeline
│   ├── claim-construction/
│   │   ├── sensitivity-detection.ts    # Stage 1: Detect ambiguous terms
│   │   ├── candidate-interpretations.ts # Stage 2: Generate broad/narrow readings
│   │   └── downstream-impact.ts        # Stage 3: Assess DI impact + build map
│   ├── direct-infringement/
│   │   ├── input-quality.ts            # Stage 1
│   │   ├── element-extraction.ts       # Stage 2
│   │   ├── element-matching.ts         # Stage 3: Baseline matching
│   │   ├── construction-dependency-mapping.ts  # Stage 4 (NEW)
│   │   ├── mode-matching.ts            # Stages 5-6: Broad + Narrow (NEW)
│   │   ├── divergence-synthesis.ts     # Stage 7 (NEW)
│   │   ├── all-elements-test.ts        # Stage 8
│   │   └── claim-interpretation.ts     # Stage 9
│   └── s117/
├── services/
│   ├── claim-construction-evaluator.ts # CC consolidation + map generation
│   ├── direct-infringement-evaluator.ts # Updated — 9-stage pipeline
│   └── s117-evaluator.ts
├── models/
│   ├── claim-construction.ts           # ConstructionMap, ConstructionTermEffect, MatchingStyle, ConstructionMode
│   ├── direct-infringement.ts          # ElementModeMatchResult, OutcomeProfile, DivergenceAssessment
│   ├── agent-input.ts                  # claim_construction_context with construction_map
│   └── ...
└── data/
    ├── agent-scenario-1..12            # Existing scenarios (unchanged)
    ├── agent-scenario-13-stable-both-modes.json    # NEW: Stable under both modes
    ├── agent-scenario-14-divergent-outcome.json     # NEW: Broad/narrow diverge
    ├── agent-scenario-15-divergent-insufficient.json # NEW: Too many uncertain
    └── agent-scenario-16-mixed-diverge-s117.json    # NEW: DI diverges + s117 strong
```

---

## API Endpoints

### GET /api/health

### POST /api/agent/evaluate (main endpoint)

### POST /api/s117/evaluate (legacy — backward-compatible)

### POST /api/direct-infringement/evaluate (standalone)

### POST /api/skills/:skillName/evaluate (individual skill)

---

## Sample Scenarios

| File | Description | Expected Result |
|------|-------------|-----------------|
| `scenario-1` | Staple product, no inducement | `unlikely_infringement` (high) |
| `scenario-2` | Non-staple, former licensee | `likely_infringement` (high) |
| `scenario-3` | Staple + strong inducement | `possible_infringement` (medium) |
| `scenario-4` | Incomplete multi-issue case | `possible_infringement` (low) |
| `scenario-5` | Direct infringement — all matched | `likely_infringement` (high) |
| `scenario-6` | Direct infringement — missing elements | `unlikely_infringement` (high) |
| `scenario-7` | Both DI + s117 | `likely_infringement` (high) |
| `scenario-8` | Ambiguous claim terms — CC + DI | `possible_infringement` (low) |
| `scenario-9` | Clear wording, CC finds no issues | `likely_infringement` (medium) |
| `scenario-10` | Disputed terms, broad≠narrow | `possible_infringement` (low) |
| `scenario-11` | Broad vs narrow changes DI | `possible_infringement` (low) |
| `scenario-12` | CC + DI + s117 all three execute | `likely_infringement` (low) |
| **`scenario-13`** | **S3.5: Stable under both modes** | **`likely_infringement` (medium)** |
| **`scenario-14`** | **S3.5: Broad/narrow diverge** | **`possible_infringement` (low)** |
| **`scenario-15`** | **S3.5: Divergent + insufficient** | **`possible_infringement` (low)** |
| **`scenario-16`** | **S3.5: DI diverges + s117 strong** | **`likely_infringement` (low)** |

---

## Limitations

- **Still heuristic** — construction-driven matching uses rule-based style selection, not full NLP
- **Not formal judicial construction** — does not apply purposive construction doctrine or prosecution history
- **No precedent ranking** — does not reference case law or weight of authority
- **No specification parsing** — specification notes are considered but not deeply analyzed
- **No novelty or inventive step skills** — detected but not analysable
- **No LLM integration** — all analysis is deterministic
- **Australian patent law only** — s117 of the Patents Act 1990 (Cth)
- **User-characterised inputs** — the system does not independently verify factual assertions

---

## Future Roadmap

| Priority | Feature | Description |
|----------|---------|-------------|
| Next | **LLM-assisted interpretation suggestions** | Semantic term interpretation via pluggable LLM provider |
| Next | **Specification parsing** | Extract relevant disclosure from patent specification text for richer narrow interpretations |
| Future | **Precedent-aware construction patterns** | Reference construction doctrine and case law |
| Future | **Novelty Skill** | Assess novelty against prior art references |
| Future | **Inventive Step Skill** | Evaluate obviousness |

---

## Design Philosophy

This is **not** a generic legal chatbot or black-box prediction engine.

It is a **structured legal reasoning system** that is:
- **Modular** — each legal question is a separate, composable skill
- **Multi-skill** — the agent detects and executes multiple skills per case
- **Ordered** — upstream skills produce operational context for downstream skills
- **Construction-driven** — claim interpretation genuinely changes how element matching is evaluated
- **Explainable** — every decision includes a traceable path of rule evaluations
- **Extensible** — new skills plug in without modifying existing code
- **Deterministic** — rule-based core produces consistent, auditable results
- **Honest** — acknowledges uncertainty, shows both interpretations, and never claims legal certainty
