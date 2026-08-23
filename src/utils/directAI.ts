/**
 * directAI.ts
 * Calls OpenRouter (or Gemini) directly from the browser.
 * Bypasses the backend so real AI responses are always served.
 */

const OPENROUTER_KEY = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = (import.meta as any).env?.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

// Detect a template/fallback response (not real AI output)
const FALLBACK_MARKERS = [
  '### Gemini AI Tutor\n\nHere is a comprehensive breakdown for',
  '1. **Overview**: Key definitions and foundational concepts.\n2. **Core Insights**',
];

export function isTemplateResponse(text: string): boolean {
  return FALLBACK_MARKERS.some(m => text.includes(m));
}

export async function directChat(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1200
): Promise<string | null> {
  // 1. Try OpenRouter
  if (OPENROUTER_KEY) {
    try {
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Obsidian AI Learning Assistant',
        },
        body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn('[directAI] OpenRouter failed:', e);
    }
  }

  // 2. Try Gemini REST API
  if (GEMINI_KEY && GEMINI_KEY !== 'your_gemini_api_key_here') {
    try {
      const geminiContents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const systemMsg = messages.find(m => m.role === 'system')?.content;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
      const body: any = { contents: geminiContents };
      if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn('[directAI] Gemini failed:', e);
    }
  }

  return null;
}

export async function directTutorChat(
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string | null> {
  return directChat([
    { role: 'system', content: 'You are Obsidian, an expert AI learning assistant. Help students understand concepts clearly with markdown formatting, headings, and bullet points.' },
    ...history.slice(-20),
    { role: 'user', content: userMessage },
  ], 1200);
}

export async function directQuizGenerate(topic: string, difficulty: string, numQuestions: number): Promise<any[] | null> {
  const prompt = `Generate exactly ${numQuestions} multiple-choice quiz questions about "${topic}" at ${difficulty} difficulty.
Return ONLY a valid JSON array (no markdown). Example:
[{"question":"Q?","options":["A","B","C","D"],"correct":0,"explanation":"Why A.","difficulty":"${difficulty}"}]
"correct" is the 0-based index of the correct option.`;
  const text = await directChat([{ role: 'user', content: prompt }], 2048);
  if (!text) return null;
  try {
    const cleaned = text.replace(/` + '```' + `json\n?|` + '```' + `\n?/g, '').trim();
    const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
    if (s !== -1 && e !== -1) return JSON.parse(cleaned.slice(s, e + 1));
  } catch { }
  return null;
}

export async function directNotesGenerate(topic: string, subject: string): Promise<any | null> {
  const prompt = `Generate comprehensive study notes on: ${topic} (Subject: ${subject}).
Return ONLY valid JSON (no markdown fences):
{"title":"Topic","summary":"Brief summary","content":"Detailed markdown content","keyPoints":["point"],"examples":["example"],"formulas":[],"relatedTopics":["topic"]}`;
  const text = await directChat([{ role: 'user', content: prompt }], 2048);
  if (!text) return null;
  try {
    const cleaned = text.replace(/` + '```' + `json\n?|` + '```' + `\n?/g, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    if (s !== -1 && e !== -1) return JSON.parse(cleaned.slice(s, e + 1));
  } catch { }
  return null;
}

export async function directMindmapGenerate(topic: string): Promise<any | null> {
  const prompt = `Generate a detailed mind map for: "${topic}".
Return ONLY valid JSON (no markdown):
{"title":"${topic}","topics":[{"id":"t1","label":"Subtopic","color":"#6366f1","subtopics":[{"id":"s1","label":"Detail"}]}]}
Include 4-6 main topics, each with 2-4 subtopics.`;
  const text = await directChat([{ role: 'user', content: prompt }], 1500);
  if (!text) return null;
  try {
    const cleaned = text.replace(/` + '```' + `json\n?|` + '```' + `\n?/g, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    if (s !== -1 && e !== -1) return JSON.parse(cleaned.slice(s, e + 1));
  } catch { }
  return null;
}

export const hasDirectAI = !!(OPENROUTER_KEY || (GEMINI_KEY && GEMINI_KEY !== 'your_gemini_api_key_here'));
