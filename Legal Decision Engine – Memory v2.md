# 🧠 Legal Decision Engine – Memory v2 (Updated)

---

## 🔥 0. Core Update Summary

Compared to v1, this version introduces **4 critical new layers**:

- Claim Risk Layer (result-based / scope control)
- Statutory Interpretation Layer (Ono / Cipla)
- Evidence Weight Layer (CSIRO / EIS)
- Litigation Strategy Layer (Costs / Calderbank)

---

## 1. Purpose

This document defines a **standardised framework** for analysing legal cases and extracting **reusable decision structures**.

Goal:

- Extract decision logic
- Build reusable reasoning patterns
- Enable AI-assisted legal decision support
- Ensure consistency + explainability

---

## 2. Core Principle

> Legal reasoning = Rules + Evidence + Interpretation + Strategy

---

## 3. Standard Analysis Framework

### 🔥 Full Structure

1. Claim Construction  
2. Claim Risk Analysis ⭐️  
3. Statutory Interpretation ⭐️  
4. Validity  
5. Infringement  
6. Evidence (Upgraded) ⭐️  
7. Litigation Strategy ⭐️  
8. Final Outcome  
9. Meta Insights  

---

## 3.1 Claim Construction

- Literal vs purposive interpretation  
- Functional vs structural claim  
- Whether wording imposes real-world constraints  

---

## 3.2 Claim Risk Analysis (NEW)

```json
{
  "claim_risk": {
    "is_result_based": true,
    "scope_breadth": "wide",
    "structural_definition": false,
    "enablement_risk": "high",
    "support_risk": "high"
  }
}