# 🧠 Legal Decision Engine – Memory README (Reusable Guide)

## 1. Purpose

This document defines a **standardised framework** for analysing legal cases and extracting **reusable decision structures**.

The goal is NOT to summarise cases, but to:

* Extract **decision logic**
* Build **reusable reasoning patterns**
* Enable **AI-assisted legal decision support**
* Ensure **consistency + explainability**

---

## 2. Core Principle

> Legal reasoning should be transformed from **implicit expertise → explicit structured logic**

Each case is treated as:

* A **Decision System**, not a narrative
* A **Graph of reasoning nodes**, not paragraphs
* A **Set of reusable rules**, not one-off conclusions

---

## 3. Standard Analysis Framework

Every case MUST be analysed using the following structure:

### (1) Claim Construction

* How the court interprets key terms
* Narrow vs broad interpretation
* Functional vs structural meaning

---

### (2) Validity

Break into sub-components:

* Sufficiency
* Support
* Clarity
* Inventive Step

Output:

* Conditions for validity
* Failure triggers

---

### (3) Infringement

Split into:

* Claim Mapping (feature-by-feature comparison)
* Direct Infringement (make/use/sell)
* Authorisation Liability

Output:

* Matching logic
* Threshold conditions

---

### (4) Evidence

Two key types:

* Experimental Evidence
* Expert Testimony

Focus on:

* Reliability
* Reproducibility
* Bias / assumptions

---

### (5) Litigation Strategy

Extract:

* Key arguments (both sides)
* Weak points
* Cost / risk considerations
* Settlement signals

---

### (6) Final Outcome

* Court decision
* Key determinants
* Turning points

---

### (7) Meta Insights (CRITICAL)

This is the most important layer.

Extract:

* Reusable decision rules
* Patterns across cases
* Hidden reasoning logic
* Strategic implications

---

## 4. Decision Node Model (Core Abstraction)

Each issue MUST be transformed into a **Decision Node**:

```
Node = {
  Issue: What legal question is being tested?
  Condition: What must be satisfied?
  Fact: What evidence is applied?
  Reasoning: How the court connects fact to condition
  Conclusion: Outcome of this node
}
```

---

## 5. Decision Flow (Graph Thinking)

Cases should NOT be linear summaries.

They must be structured as:

* Nodes → connected into a **Decision Graph**
* Each node:

  * Has dependencies
  * Can block or enable downstream nodes

Example:

```
Validity → Claim Scope → Infringement → Liability → Damages
```

---

## 6. Rule Extraction Layer (VERY IMPORTANT)

From each case, extract:

### (A) Explicit Rules

* Directly stated by the court

### (B) Implicit Rules

* Derived from reasoning patterns

### (C) Strategic Rules

* How parties succeed or fail

---

## 7. Pattern Library (Cross-Case Learning)

Across multiple cases, identify:

* Repeated reasoning structures
* Common failure points
* Standard argument patterns

Goal:
Build a **Legal Decision Pattern Library**

---

## 8. Evolution Strategy (How to Use This in New Chats)

When analysing new cases:

### Step 1 — Apply Framework

Strictly follow Sections 3–6

---

### Step 2 — Compare with Existing Patterns

Ask:

* Does this case follow an existing pattern?
* Does it introduce a new rule?
* Does it contradict previous logic?

---

### Step 3 — Update Structure (Controlled Evolution)

Only update structure if:

* A new recurring pattern appears
* A critical missing dimension is identified

Otherwise:

* Extend via **plugins**, not structural changes

---

## 9. Output Format Requirement

Each analysis MUST return:

### (A) Structured JSON

Including:

* All 7 sections
* Decision nodes
* Rules

---

### (B) Key Reasoning Summary

Short explanation of:

* Why the decision was made
* What rule is reusable

---

## 10. Design Philosophy

This system is designed to:

* Support **lawyers**, not replace them
* Provide **traceable reasoning**
* Enable **AI augmentation with control**

---

## 11. End Goal

To build a system capable of:

* Case analysis automation
* Legal reasoning standardisation
* Decision explainability
* Scalable legal intelligence

---

## 12. Instruction for Any New Chat

When using this README in a new chat, always instruct:

> “Analyse the case using the Legal Decision Engine framework.
> Focus on extracting reusable decision rules and decision nodes, not just summarising the case.”

---

# 🚀 Final Note

This framework is **intentionally evolving**.

* Early stage → allow structure refinement
* Later stage → stabilise core + extend via modules

The goal is to reach a point where:

> New cases improve the system, but do not fundamentally change it.
