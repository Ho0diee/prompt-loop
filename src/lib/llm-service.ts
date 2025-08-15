import { PlanResponse, ChecklistItem, RefinePromptResponse } from '@/types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

function assertPlanResponse(data: any): asserts data is PlanResponse & { patch_prompt?: string } {
  if (!data || typeof data.plan !== 'string' || !Array.isArray(data.checklist)) {
    throw new Error('Invalid plan response shape');
  }
}

function assertRefineResponse(data: any): asserts data is RefinePromptResponse {
  if (!data || typeof data.updated_prompt !== 'string') {
    throw new Error('Invalid refine response shape');
  }
}

export const llmService = {
  async generatePlan(idea: string, failureTags: string[] = [], heuristics: string[] = []): Promise<PlanResponse & { patch_prompt?: string }> {
    const res = await fetch(`${API_BASE}/api/llm/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, failure_tags: failureTags, heuristics }),
    });
    if (!res.ok) throw new Error(`Plan request failed: ${res.status}`);
    const data = await res.json();
    assertPlanResponse(data);
    return data;
  },

  async generatePatchPrompt(step: ChecklistItem, constraints: string[]): Promise<string> {
    // Generate prompt locally using step + constraints to avoid needing another endpoint
    return `Surgical change: ${step.step}

Only add/change: The specific components and functions needed for "${step.step}".
Don't touch: Existing styles, unrelated components, or configuration files.
Keep styles/conventions: Use existing design patterns and component structure.

Target: ${step.expected}
Reason: ${step.why}

Constraints:\n${constraints.map((c) => `- ${c}`).join('\n')}

If a test is easy, add/adjust one minimal test. Keep diff small.`;
  },

  async refinePrompt(planSummary: string, checklistStatus: string, failureReasons: string[], heuristics: string[]): Promise<RefinePromptResponse> {
    const res = await fetch(`${API_BASE}/api/llm/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: `${planSummary} | Status: ${checklistStatus}`,
        check_results: checklistStatus,
        failure_notes: failureReasons,
        heuristics,
      }),
    });
    if (!res.ok) throw new Error(`Refine request failed: ${res.status}`);
    const data = await res.json();
    assertRefineResponse(data);
    return data;
  },
};