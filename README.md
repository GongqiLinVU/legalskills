# Legal Decision Agent

A **multi-skill legal decision agent** for Australian patent law (s117 Patents Act 1990). The system receives a legal problem, identifies relevant issues, selects and executes appropriate legal reasoning skills, and returns a structured, explainable decision report.

> **Disclaimer:** This is a prototype legal reasoning system, not legal advice. It is intended for research, education, and proof-of-concept purposes only.

## Overview

The project consists of two modules:

| Module | Description | Tech Stack |
|--------|-------------|------------|
| **s117-engine** | Backend reasoning engine — rule-based pipeline with multi-skill orchestration | Express, TypeScript |
| **s117-client** | Interactive frontend for submitting cases and viewing results | React, Vite, TypeScript |

## Features

- **Issue Detection** — automatically identifies legal issues (claim construction, direct infringement, indirect infringement) from case inputs
- **Multi-Skill Orchestration** — selects and orders relevant legal skills per case
- **Claim Construction** — detects ambiguous terms, generates broad/narrow interpretations, and builds a structured construction map
- **Construction-Driven Direct Infringement** — 9-stage pipeline where claim interpretation genuinely drives element matching under broad and narrow modes
- **s117 Indirect Infringement** — evaluates supplier liability based on staple product doctrine, inducement, and supplier knowledge
- **Divergence Analysis** — compares outcomes across interpretation modes, flagging when broad vs. narrow readings change the result
- **Explainable Decisions** — every output includes traceable reasoning chains

## Architecture

```
POST /api/agent/evaluate
         │
    Orchestrator
         │
   ┌─────┼──────────────┐
   ▼     ▼              ▼
 Claim  Direct        s117
 Const. Infringement  Skill
   │     │
   └─────┘
 (construction map flows CC → DI)
```

Skills execute in priority order. Claim construction runs first to produce a construction map, which direct infringement uses for mode-sensitive element matching.

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Run Both Servers

```bash
./start.sh
```

This starts:
- Backend at http://localhost:3000
- Client at http://localhost:5173

### Run Individually

**Backend:**
```bash
cd s117-engine
npm install
npm run dev
```

**Frontend:**
```bash
cd s117-client
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/agent/evaluate` | Main endpoint — multi-skill agent evaluation |
| POST | `/api/s117/evaluate` | Legacy — s117 indirect infringement only |
| POST | `/api/direct-infringement/evaluate` | Standalone direct infringement |
| POST | `/api/skills/:skillName/evaluate` | Individual skill execution |

## Test Scenarios

16 built-in scenarios covering:
- Staple/non-staple product supply
- Direct infringement with matched/missing elements
- Claim construction with ambiguous terms
- Construction-driven broad/narrow divergence
- Mixed multi-skill cases (CC + DI + s117)

## Limitations

- Rule-based heuristics, not NLP or LLM-powered
- Australian patent law only (s117 Patents Act 1990)
- No precedent ranking or case law references
- No specification parsing or prosecution history
- User-characterised inputs — does not independently verify facts

## License

Research and educational use only.
