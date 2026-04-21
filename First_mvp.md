You are helping me build the first runnable version of a Legal Decision Engine for Australian patent law.

We already completed the structure design phase. Your task now is NOT to redesign the legal framework. Your task is to IMPLEMENT the first working module.

---

# PROJECT CONTEXT

We have a stabilised framework called “Legal Decision Engine – Memory README v3”.

Core structure already frozen:

0. Procedural & Context Layer
1. Claim Structure Layer
2. Claim Construction
3. Validity
4. Infringement
   4.1 Direct Infringement
   4.2 Indirect Infringement (s117)
5. Defences & Exceptions
6. Remedies & Relief
7. Procedural Control Layer
8. Meta Decision Layer

Important: do NOT redesign this structure unless absolutely necessary for implementation.

---

# IMPLEMENTATION GOAL

Build the FIRST RUNNABLE VERSION focused on:

## Module 1: s117 Indirect Infringement Engine

This module should determine whether supply of a product may amount to patent infringement under s 117 of the Patents Act 1990 (Cth), using a structured decision flow.

This first version is a practical MVP, not a perfect legal expert system.

---

# LEGAL CORE FOR THIS MODULE

The MVP must include these concepts:

1. If the product is a "staple commercial product", this is a major gatekeeper.
2. If staple commercial product = true, the engine should strongly tend toward no s117 infringement unless a separate pathway is triggered by explicit instructions / inducement logic.
3. The module must distinguish:
   - staple product analysis
   - supplier knowledge / reason to believe
   - instructions for use
   - inducement / advertisement pathway
4. The output must be explainable and show which branch of the logic was used.
5. The module is not deciding the whole patent case. It only decides the s117 supply-liability pathway.

Use the structure we derived from the cases:
- Hood v Down Under Enterprises (staple commercial product)
- our Memory README v3 logic
- gatekeeping + dependency logic

Do NOT overclaim legal certainty. This is a structured reasoning prototype.

---

# REQUIRED DELIVERABLES

Please generate a small but runnable project with:

## 1. Backend
Use one of these stacks:
- Preferred: Node.js + TypeScript + Express
- Alternative: Python + FastAPI

Choose the stack that gives the clearest and fastest MVP.

## 2. API
Provide at least these endpoints:

### POST /api/s117/evaluate
Input:
- patent_context
- product
- supplier_conduct
- evidence_flags

Output:
- likely_result
- confidence
- decision_path
- triggered_rules
- explanation
- warnings

### GET /api/health
Simple health check

## 3. Data model
Define clear TypeScript interfaces or Python models for:
- PatentContext
- ProductInfo
- SupplierConduct
- EvidenceFlags
- DecisionNodeResult
- S117EvaluationResult

## 4. Rule engine layer
Implement a simple rule evaluation service, not a hardcoded controller mess.

The engine should:
- evaluate gatekeepers first
- then evaluate downstream branches
- return a structured decision trace

## 5. Demo data
Include at least 3 example input JSON files:
- staple product / no inducement
- non-staple product / likely infringement
- staple product / but explicit instructions or inducement evidence

## 6. Documentation
Create:
- README.md
- explanation of project structure
- how to run locally
- example curl requests
- assumptions and limitations

---

# OUTPUT DESIGN REQUIREMENTS

The engine output must be explainable.

Example output shape:

{
  "module": "s117_indirect_infringement",
  "likely_result": "unlikely_infringement",
  "confidence": "medium",
  "decision_path": [
    {
      "step": "staple_product_test",
      "result": true,
      "effect": "gatekeeper_triggered"
    },
    {
      "step": "instructions_or_inducement_test",
      "result": false,
      "effect": "no_override"
    }
  ],
  "triggered_rules": [
    "IF product = staple commercial product THEN s117 pathway weakens significantly"
  ],
  "explanation": "The supplied product appears to be a staple commercial product and there is currently no strong evidence of explicit instructions or inducement toward infringing use.",
  "warnings": [
    "This is a prototype legal reasoning tool, not legal advice.",
    "Outcome depends heavily on factual characterisation of the product and evidence of supplier conduct."
  ]
}

---

# DECISION LOGIC REQUIREMENTS

Implement the logic as a staged flow, such as:

## Stage 1: Input quality / completeness
- Check missing fields
- If key fields missing, still return a result but lower confidence and add warnings

## Stage 2: Staple commercial product gatekeeper
- Determine whether the product is likely staple / non-staple / uncertain
- Do not pretend this is always binary
- Support:
  - true
  - false
  - uncertain

## Stage 3: Supplier mental state / reason to believe
- Evaluate whether there is evidence the supplier had reason to believe the product would be used in an infringing way

## Stage 4: Instructions / inducement / advertisement
- Evaluate whether supplier instructions, advertising, or encouragement point toward infringing use

## Stage 5: Consolidated result
- Produce:
  - likely_infringement
  - possible_infringement
  - unlikely_infringement
  - insufficient_information

---

# ENGINEERING REQUIREMENTS

1. Keep code clean and modular
2. Use typed models
3. Separate:
   - routes
   - controllers
   - services
   - rules
   - models
   - sample data
4. Add simple validation
5. Add comments only where helpful
6. Make it easy to extend later into:
   - direct infringement module
   - claim construction assist
   - inventive step module

---

# IMPORTANT PRODUCT CONSTRAINTS

This is NOT a generic chatbot.

It is a structured legal reasoning backend.

So:
- no LLM integration yet unless clearly useful and isolated
- no unnecessary UI complexity
- focus on logic + traceability
- build for future extensibility

---

# WHAT I WANT FROM YOU

Please produce:

1. the full project structure
2. the code files
3. a concise architecture explanation
4. sample requests/responses
5. notes on where future modules plug in

If there is any ambiguity, make reasonable implementation decisions and state them in the README instead of stopping.

Start building the MVP now.