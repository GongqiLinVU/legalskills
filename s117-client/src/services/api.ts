import {
  S117EvaluationRequest,
  S117EvaluationResult,
  AgentInput,
  AgentOutput,
} from "../types";

const API_BASE = "http://localhost:3000";

export async function evaluateS117(
  request: S117EvaluationRequest
): Promise<S117EvaluationResult> {
  const res = await fetch(`${API_BASE}/api/s117/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function evaluateAgent(
  request: AgentInput
): Promise<AgentOutput> {
  const res = await fetch(`${API_BASE}/api/agent/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}
