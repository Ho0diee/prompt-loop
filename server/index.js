import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 8787;
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const clamp = (xs) => xs.slice(0, Math.max(3, Math.min(7, xs.length || 5)));

async function askJSON(system, user) {
  if (!openai) return null;
  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const t = r.choices?.[0]?.message?.content?.trim() || '';
    const j = t.startsWith('{') ? t : t.slice(t.indexOf('{'));
    return JSON.parse(j);
  } catch (e) {
    console.error('OpenAI', e.message);
    return null;
  }
}

const planSys = 'Return only JSON: {plan, checklist[{step,why,expected}], patch_prompt, surgical_constraints[]}';
const planUser = (p) => `Goal: ${p.idea}
Failure tags: ${arr(p.failure_tags).join(', ') || 'none'}
Heuristics: ${arr(p.heuristics).join(' | ') || 'none'}
`;

const refineSys = 'Return only JSON: {updated_prompt, reasons_for_changes[], additional_checks[], focus_step_ids?}';
const refineUser = (p) => `Plan: ${p.plan}
Results: ${JSON.stringify(p.check_results)}
Failures: ${arr(p.failure_notes).join(' | ') || 'none'}`;

const mockPlan = (idea) => {
  const checklist = clamp([
    { step: 'Set up component structure', why: 'Foundation', expected: 'Component renders' },
    { step: 'Implement core logic', why: 'Main value', expected: 'Feature works' },
    { step: 'Add error handling', why: 'Resilience', expected: 'Graceful errors' },
    { step: 'Write basic test', why: 'Verify', expected: 'Test passes' },
  ]);
  const surgical_constraints = ['Only add necessary files', 'Keep styles/conventions', 'Preserve TS types', 'Minimal diff'];
  const patch_prompt = `Surgical change: Implement "${idea}"
Target: ${checklist[0].expected}
Reason: ${checklist[0].why}
Constraints:\n${surgical_constraints.map((c) => `- ${c}`).join('\n')}`;
  return { plan: `Implement ${idea} with minimal, safe edits.`, checklist, surgical_constraints, patch_prompt };
};

app.post('/api/llm/plan', async (req, res) => {
  const { idea } = req.body || {};
  if (!idea) return res.status(400).json({ error: 'idea is required' });
  const ai = await askJSON(planSys, planUser(req.body || {}));
  const out = ai || mockPlan(idea);
  if (!out.plan || !Array.isArray(out.checklist) || out.checklist.length === 0) return res.status(502).json({ error: 'bad ai' });
  out.checklist = clamp(out.checklist);
  if (!Array.isArray(out.surgical_constraints) || out.surgical_constraints.length === 0) out.surgical_constraints = ['Minimal diff'];
  res.json(out);
});

app.post('/api/llm/refine', async (req, res) => {
  const { plan } = req.body || {};
  if (!plan) return res.status(400).json({ error: 'plan is required' });
  const ai = await askJSON(refineSys, refineUser(req.body || {}));
  const out = ai || {
    updated_prompt: 'Surgical change: Address failures precisely. Keep diff small.',
    reasons_for_changes: ['Focus on failure context'],
    additional_checks: ['Reproduce failing scenario'],
    focus_step_ids: null,
  };
  if (!out.updated_prompt) return res.status(502).json({ error: 'bad ai' });
  res.json(out);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`LLM API: http://localhost:${PORT}`));
