export interface Update {
  id: string;
  idea: string;
  plan: string;
  checklist: ChecklistItem[];
  status: 'pending' | 'pass' | 'fail';
  failureReason?: string;
  promptUsed: string;
  updatedPrompt?: string;
  summary: string;
  createdAt: string;
  fileList?: string[];
  type?: 'normal' | 'quickEdit';
  quickEditData?: QuickEditData;
}

export interface QuickEditData {
  file: string;
  anchor: string;
  before: string;
  after: string;
  occurrenceCount: number;
  diffPreview: string;
  scope: 'single' | 'selected' | 'all';
}

export interface ChecklistItem {
  id: string;
  step: string;
  why: string;
  expected: string;
  status: 'pending' | 'pass' | 'fail';
  failureReason?: string;
}

export interface Heuristic {
  id: string;
  pattern: string;
  score: number;
  createdAt: string;
}

export interface PlanResponse {
  plan: string;
  checklist: Array<{
    step: string;
    why: string;
    expected: string;
  }>;
  surgical_constraints: string[];
}

export interface PatchPromptRequest {
  checklist_step: ChecklistItem;
  surgical_constraints: string[];
  file_tree?: string;
  snippets?: string;
}

export interface RefinePromptResponse {
  updated_prompt: string;
  reasons_for_changes: string[];
  additional_checks: string[];
}