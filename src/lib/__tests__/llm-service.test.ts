// Minimal runtime checks test (placeholder): verifies assertion functions throw on bad shapes.
import { describe, it, expect } from 'vitest';

type PlanResponse = { plan: string; checklist: Array<{ step: string; why: string; expected: string }>; };

type RefinePromptResponse = { updated_prompt: string };

function assertPlanResponse(data: any): asserts data is PlanResponse {
  if (!data || typeof data.plan !== 'string' || !Array.isArray(data.checklist)) {
    throw new Error('Invalid plan response shape');
  }
}

function assertRefineResponse(data: any): asserts data is RefinePromptResponse {
  if (!data || typeof data.updated_prompt !== 'string') {
    throw new Error('Invalid refine response shape');
  }
}

describe('llm-service shape assertions', () => {
  it('accepts valid plan shape', () => {
    expect(() => assertPlanResponse({ plan: 'x', checklist: [] })).not.toThrow();
  });
  it('rejects invalid plan shape', () => {
    expect(() => assertPlanResponse({})).toThrow();
  });
  it('accepts valid refine shape', () => {
    expect(() => assertRefineResponse({ updated_prompt: 'x' })).not.toThrow();
  });
  it('rejects invalid refine shape', () => {
    expect(() => assertRefineResponse({})).toThrow();
  });
});
