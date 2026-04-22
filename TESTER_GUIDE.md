# Legal Decision Agent — Tester Guide for Patent Law Practitioners

Thank you for taking the time to review this tool. Your feedback as a practitioner will be invaluable in making the system genuinely useful for lawyers working in patent infringement matters.

## What This Tool Does

This is a **preliminary patent infringement assessment tool** for Australian law. You provide the details of a patent claim, an accused product, and (optionally) supplier conduct information, and the system produces a structured analysis covering:

- **Claim Construction** — identifies claim terms that may be ambiguous or disputed, and shows how broad vs. narrow construction of those terms would affect the outcome
- **Direct Infringement** — compares the accused product against each integer of the patent claim under the all-elements rule
- **s117 Supplier Liability** — assesses whether the supplier may be liable under s117 of the *Patents Act 1990* (Cth), considering staple product status, supplier knowledge, and instructions/inducement

The system is entirely rule-based and deterministic — it does not use AI language models. It is a prototype intended for research and education, not a substitute for legal advice.

---

## How to Access

Open this URL in your browser:

**https://legalskills.vercel.app/**

No login or installation is required.

---

## Step-by-Step Testing Instructions

### Test 1: Use a Built-in Scenario (5 minutes)

This is the quickest way to see what the system does.

1. Open https://legalskills.vercel.app/
2. Make sure **"Agent Analysis"** is selected (it should be by default)
3. At the top of the form, find the **scenario selector dropdown**
4. Select any scenario — for example:
   - **"Scenario 14: Divergent Outcome"** — this is a good one because the result changes depending on how the disputed claim terms are construed
   - **"Scenario 16: Mixed DI + s117"** — this shows how the system handles both direct and indirect infringement together
5. The form fields will auto-populate with the scenario data
6. Click **"Run Agent Analysis"**
7. Review the output — in particular:
   - The **Summary** section at the top (the main explanation)
   - The **Detailed Analysis** cards for each area (Claim Construction, Direct Infringement, s117)
   - The **Construction-Sensitive Analysis** section within the Direct Infringement card, which shows how individual claim integers change under broad vs. narrow construction
   - The **Caveats & Limitations** section at the bottom

### Test 2: Enter Your Own Fact Pattern (15–20 minutes)

This is the most valuable test. Think of a real or hypothetical patent infringement scenario you are familiar with, and enter it manually.

**For Direct Infringement analysis, you will need:**

- **Patent Context** (optional but helpful): Patent number, title, and a brief description of the relevant claim
- **Claim Text**: The full text of the relevant claim (e.g., "A device comprising: a sensor; a processor configured to...") 
- **Claim Integers** (optional): You can list the individual integers of the claim. If you don't, the system will attempt to extract them from the claim text
- **Accused Product Description**: A description of the product alleged to infringe
- **Element Mapping** (optional): Your notes on whether each integer is present (e.g., "Accused product has a temperature sensor — appears to satisfy integer 1")
- **Disputed Terms**: If claim construction is in issue, note which terms are disputed and tick the "Claim construction is disputed" checkbox
- **Specification Notes** (optional): Any relevant context from the specification

**For s117 Supplier Liability analysis, you will also need:**

- **Product Name** and whether it is a **staple commercial product**
- **Supplier Conduct**: Whether the supplier had reason to believe the product would be used to infringe, whether instructions for infringing use were provided, and whether use was induced or advertised

Fill in what you can and click **"Run Agent Analysis"**. The system will automatically identify which legal issues arise from your inputs and select the appropriate analyses.

### Test 3: s117 Only Mode (5 minutes)

1. Switch to **"s117 Only"** mode using the toggle at the top
2. Enter product and supplier conduct details
3. Click **"Run s117 Assessment"**
4. This runs the indirect infringement analysis in isolation, without direct infringement or claim construction

---

## What to Look For

As you review the output, please consider:

### Accuracy of Legal Reasoning
- Does the all-elements analysis correctly identify which claim integers are / are not present?
- Does the claim construction analysis identify the right terms as ambiguous?
- Are the broad and narrow interpretations reasonable?
- Does the s117 analysis follow the correct statutory pathway (s117(2)(a), (b), (c))?
- Is the overall assessment reasonable given the inputs?

### Quality of Explanations
- Does the summary read clearly to a lawyer? Is there anything that feels like "developer speak"?
- Are the legal conclusions stated in a way you would expect in a preliminary opinion or memo?
- Is the distinction between broad and narrow construction clearly explained?
- Are the caveats appropriate and professionally worded?

### Usefulness
- Would you find this tool useful in practice, even as a starting point for analysis?
- What additional information would you want the system to provide?
- Is there anything important that the system misses or gets wrong?
- Would you use this with a client, or only internally?

### Terminology
- Is the language appropriate for an Australian patent law context?
- Are there terms that should be different? (e.g., the system uses both "integers" and "elements" — is one preferred?)

---

## Feedback Form

Please provide your feedback in whatever format is convenient. If it helps, here is a structured template:

```
Name:
Role / Experience:
Date:

1. OVERALL IMPRESSION
   - First reaction to the tool (1-2 sentences):
   - Would you use this in practice? (Yes / No / Maybe — explain):

2. LEGAL ACCURACY
   - Any errors in the legal reasoning? (describe):
   - Are the broad/narrow constructions reasonable? (Yes / No — examples):
   - Is the s117 statutory pathway correct? (Yes / No — details):

3. LANGUAGE & PRESENTATION
   - Does the summary read like a legal memo? (Yes / No — what would you change):
   - Any terms or phrases that feel wrong or out of place?:
   - Are the caveats appropriate? (Yes / No — suggestions):

4. MISSING FEATURES (what would make this more useful)
   - What information is missing from the output?:
   - What input fields are missing from the form?:
   - Any other legal issues the system should cover?:

5. SCENARIO FEEDBACK (if you entered your own fact pattern)
   - Brief description of the scenario you tested:
   - Was the result reasonable? (Yes / No — explain):
   - What did the system get right?:
   - What did the system get wrong?:

6. OTHER COMMENTS
   -
```

---

## Known Limitations

Please be aware of the following before testing:

- The system is **rule-based and heuristic** — it does not use natural language understanding or AI language models
- It applies **Australian patent law only** (s117 of the *Patents Act 1990* (Cth))
- It does not perform **formal purposive construction** or apply the *Catnic* / *Kirin-Amgen* principles
- It does not reference **case law or precedent** (e.g., *Northern Territory v Collins*, *Apotex v Sanofi-Aventis*)
- It does not assess **validity** (novelty, inventive step, fair basis) — these issues are detected but not analysable
- It does not parse the **patent specification** in detail
- All inputs are **user-characterised** — the system does not independently verify factual assertions
- Claim integer extraction from free-text claims is heuristic and may not match how a court would break down the claim

---

## Contact

If you have questions about the tool or encounter any issues, please contact:

**[Your name / email here]**

Thank you for your time and expertise.
