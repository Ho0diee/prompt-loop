import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
const PORT = process.env.PORT || 3000;
const ATLAS_API_KEY = process.env.ATLAS_API_KEY || '';
const MODEL_ID = process.env.MODEL_ID || 'gpt-5-thinking';
const ATLAS_API_BASE = process.env.ATLAS_API_BASE || 'https://api.openai.com';

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

function stripCodeFences(text = '') {
  const trimmed = text.trim();
  const fenceRegex = /^```(?:json)?\n([\s\S]*?)\n```$/;
  const m = trimmed.match(fenceRegex);
  if (m) return m[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

async function callAtlasJSON({ systemPrompt, userPrompt }) {
  if (!ATLAS_API_KEY) throw new Error('ATLAS_API_KEY missing');
  const url = `${ATLAS_API_BASE}/v1/chat/completions`;
  const body = {
    model: MODEL_ID,
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ATLAS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Atlas error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const jsonText = stripCodeFences(content);
  return JSON.parse(jsonText);
}

app.post('/api/llm/plan', async (req, res) => {
  try {
    const { idea, X, Y, file_tree, snippets, failure_tags, heuristics, acceptance_criteria, tiny_test } = req.body || {};
    if (!idea || typeof idea !== 'string') return res.status(400).json({ error: 'idea is required' });

    const systemPrompt = 'You are a senior engineer. Return strict JSON only: a concise plan, a 3-7 step checklist, and a ready-to-paste patch_prompt. Keep changes surgical.';
    const userPrompt = `Idea: ${idea}\nX: ${X || ''}\nY: ${Y || ''}\nFile tree:\n${file_tree || 'n/a'}\nSnippets:\n${snippets || 'n/a'}\nFailure tags: ${(failure_tags || []).join(', ') || 'none'}\nHeuristics: ${(heuristics || []).join(' | ') || 'none'}\nAcceptance criteria:\n${acceptance_criteria || 'n/a'}\nTiny test:\n${tiny_test || 'n/a'}\n\nJSON schema: { "plan": string, "checklist": Array<{"step": string, "why": string, "expected": string}>, "patch_prompt": string }`;

    const out = await callAtlasJSON({ systemPrompt, userPrompt });
    const { plan, checklist, patch_prompt } = out || {};
    if (!plan || !Array.isArray(checklist) || checklist.length === 0 || !patch_prompt) {
      return res.status(400).json({ error: 'Invalid LLM output' });
    }
    const capped = checklist.slice(0, 7);
    return res.json({ plan, checklist: capped, patch_prompt });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
});

app.post('/api/llm/refine', async (req, res) => {
  try {
    const { plan, check_results, failure_notes, logs, X, Y, snippets, acceptance_criteria, heuristics } = req.body || {};
    if (!plan || typeof plan !== 'string') return res.status(400).json({ error: 'plan is required' });

    const systemPrompt = 'You improve prompts using explicit failure reasons. Return strict JSON only: updated_prompt, reasons_for_changes[], additional_checks[], optional focus_step_ids[]. Keep scope surgical.';
    const userPrompt = `Plan: ${plan}\nResults: ${typeof check_results === 'string' ? check_results : JSON.stringify(check_results || [])}\nFailures:\n${(failure_notes || []).map((r) => `- ${r}`).join('\n') || 'none'}\nLogs:\n${logs || 'n/a'}\nHeuristics: ${(heuristics || []).join(' | ') || 'none'}\nSnippets:\n${snippets || 'n/a'}\nAcceptance criteria:\n${acceptance_criteria || 'n/a'}\nX: ${X || ''}\nY: ${Y || ''}\n\nJSON schema: { "updated_prompt": string, "reasons_for_changes": string[], "additional_checks": string[], "focus_step_ids"?: string[] }`;

    const out = await callAtlasJSON({ systemPrompt, userPrompt });
    const { updated_prompt, reasons_for_changes = [], additional_checks = [], focus_step_ids = null } = out || {};
    if (!updated_prompt) return res.status(400).json({ error: 'updated_prompt missing' });
    return res.json({ updated_prompt, reasons_for_changes, additional_checks, focus_step_ids });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// Serve built frontend if available
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log('Server on', PORT, 'key?', !!ATLAS_API_KEY, 'model:', MODEL_ID);
});
