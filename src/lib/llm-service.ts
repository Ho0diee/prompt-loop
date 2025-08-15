import { PlanResponse, ChecklistItem, RefinePromptResponse } from '@/types';

// Mock LLM service - in a real app, this would call an actual LLM API
export const llmService = {
  generatePlan: async (idea: string, failureTags: string[] = [], heuristics: string[] = []): Promise<PlanResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock response based on the idea
    const mockChecklist = [
      {
        step: "Set up component structure",
        why: "Need foundation before adding functionality",
        expected: "Component renders without errors"
      },
      {
        step: "Implement core logic",
        why: "Main feature implementation",
        expected: "Feature works as intended"
      },
      {
        step: "Add error handling",
        why: "Prevent crashes and improve UX",
        expected: "Graceful error states displayed"
      },
      {
        step: "Write basic test",
        why: "Ensure functionality is verified",
        expected: "Test passes consistently"
      }
    ];

    return {
      plan: `Implement ${idea} with minimal changes to existing codebase, focusing on surgical edits and maintaining current patterns.`,
      checklist: mockChecklist.slice(0, Math.min(4, Math.max(2, Math.ceil(Math.random() * 4)))),
      surgical_constraints: [
        "Only add necessary files",
        "Keep existing styles and conventions",
        "Maintain current TypeScript patterns",
        "Add minimal test coverage"
      ]
    };
  },

  generatePatchPrompt: async (step: ChecklistItem, constraints: string[]): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Surgical change: ${step.step}

Only add/change: The specific components and functions needed for "${step.step}". 
Don't touch: Existing styles, unrelated components, or configuration files.
Keep styles/conventions: Use existing design patterns and component structure.

Target: ${step.expected}
Reason: ${step.why}

Constraints:
${constraints.map(c => `- ${c}`).join('\n')}

If a test is easy, add/adjust one minimal test. Keep diff small.`;
  },

  refinePrompt: async (
    lastSummary: string,
    checklistStatus: string,
    failureReasons: string[],
    heuristics: string[]
  ): Promise<RefinePromptResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      updated_prompt: `Surgical change: ${lastSummary} (refined)

Address failure: ${failureReasons.join(', ')}
Only add/change: The minimal fix for the specific failure.
Don't touch: Working components or unrelated code.

Additional guardrails:
- Verify types match interfaces
- Test the exact failure scenario
- Keep changes under 50 lines

If a test is easy, add/adjust one minimal test. Keep diff small.`,
      reasons_for_changes: [
        "Added specific failure context",
        "Narrowed scope to exact issue",
        "Added type safety guardrails"
      ],
      additional_checks: [
        "Run TypeScript compiler check",
        "Test the specific failure scenario"
      ]
    };
  }
};