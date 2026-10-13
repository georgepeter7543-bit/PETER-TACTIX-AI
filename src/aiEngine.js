/**
 * PETER TACTIX AI — Dynamic AI Engine
 * All responses come from live Gemini API via the secure /api/chat backend.
 * Zero static templates. Zero hardcoded mock replies.
 */

import { performLiveWebSearch } from './searchService.js'

// ── System Persona ────────────────────────────────────────────
export const SYSTEM_PERSONA =
  'You are PETER TACTIX AI, an intelligent, empathetic, and multi-tasking AI workspace built by Peter George Peter. You understand user intent natively. Answer all questions naturally, directly, and accurately.'

// ── Intent Detection (for search grounding only) ─────────────
export function detectQueryIntent(prompt, explicitMode) {
  if (!prompt || typeof prompt !== 'string') {
    return { needsWebSearch: false, searchQuery: '' }
  }
  const clean = prompt.trim()
  const lower = clean.toLowerCase()

  const searchTriggers = [
    'latest', 'recent', 'current', 'news', 'today', 'yesterday', 'now',
    'release', 'released', 'newest', 'updates', 'upcoming', 'roadmap',
    'score', 'scores', 'match', 'who won', 'winner of', 'weather',
    'price of', 'market cap', 'stock', 'cryptocurrency', 'bitcoin',
    'search for', 'search the web', 'look up', 'find online',
    'browse for', 'what happened', 'when will',
    '2024', '2025', '2026',
  ]

  const needsWebSearch = searchTriggers.some(t => lower.includes(t))
  let searchQuery = clean
  if (needsWebSearch) {
    searchQuery = clean
      .replace(/^(search for|search the web for|look up|find|please tell me|can you tell me|tell me about)\s+/i, '')
      .replace(/[?!.]+$/g, '')
      .trim() || clean
  }

  return { needsWebSearch, searchQuery }
}

// ── Core LLM Caller ──────────────────────────────────────────
export async function callLLM({ systemInstruction = SYSTEM_PERSONA, messages = [] }) {
  const payload = {
    messages: messages.filter(m => (m.content || m.text || '').trim()),
    systemInstruction,
  }

  // ── Route directly to secure backend /api/chat endpoint ──────
  const ctrl = new AbortController()
  // Generous 60-second timeout for model completion and live web search context
  const tid = setTimeout(() => ctrl.abort(), 60_000)

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  ctrl.signal,
    })
    clearTimeout(tid)

    if (!res.ok) {
      let errText = ''
      try {
        const errJson = await res.json()
        errText = errJson.error || ''
      } catch {
        errText = await res.text().catch(() => '')
      }
      throw new Error(errText || `Server responded with HTTP status ${res.status}`)
    }

    const data = await res.json()
    if (data.error) {
      throw new Error(data.error)
    }

    if (data.text && data.text.trim()) {
      return {
        text: data.text.trim(),
        provider: data.provider || 'Google Gemini',
      }
    }

    throw new Error('Empty response received from backend.')
  } catch (err) {
    clearTimeout(tid)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out (60s). Backend server took too long to respond.')
    }
    throw err
  }
}

// ── Extract first fenced code block from LLM response ────────
function extractCodeBlock(text) {
  const m = text.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/)
  if (m) return { lang: m[1] || 'text', code: m[2].trim() }
  return null
}

// ── Main Entry: generateAIResponseAsync ──────────────────────
export async function generateAIResponseAsync(
  prompt,
  explicitMode,
  onStatusUpdate,
  history = []
) {
  const { needsWebSearch, searchQuery } = detectQueryIntent(prompt, explicitMode)
  const t0 = Date.now()

  const histMessages = history
    .slice(-16)
    .map(m => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: (m.content || m.text || '').trim(),
    }))
    .filter(m => m.content)

  // ── SEARCH: Grounded real-time web answer ─────────────────
  if (needsWebSearch) {
    if (onStatusUpdate) onStatusUpdate(`Searching the web for: "${searchQuery}"…`)

    let searchContext = ''
    let sources = []
    try {
      const searchData = await performLiveWebSearch(searchQuery)
      sources = searchData.results || []
      if (sources.length > 0) {
        searchContext = sources
          .map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.link}\nExcerpt: ${r.snippet}`)
          .join('\n\n')
      }
    } catch (_) {
      // search failed — still try to answer from model knowledge
    }

    const searchElapsed = ((Date.now() - t0) / 1000).toFixed(1)
    if (onStatusUpdate) onStatusUpdate('Synthesising live web context with Gemini…')

    const webSystemInstruction = `${SYSTEM_PERSONA}

The user asked a question that may require up-to-date information.
${searchContext
  ? `Here are real-time web search results for "${searchQuery}":\n\n${searchContext}\n\nUse these results to answer accurately. Cite sources with markdown links where relevant.`
  : `No live web results were retrieved. Answer from your best knowledge and note that information may not be current.`
}`

    const messages = [
      ...histMessages,
      { role: 'user', content: prompt },
    ]

    const completion = await callLLM({ systemInstruction: webSystemInstruction, messages })
    const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1)
    const codeBlock = extractCodeBlock(completion.text)

    return {
      type:         'search',
      thought:      `Queried web for "${searchQuery}" → ${sources.length} source(s). Grounded answer via ${completion.provider}.`,
      thoughtTime:  `${searchElapsed}s`,
      workTime:     `${totalElapsed}s`,
      text:         completion.text,
      code:         codeBlock?.code ?? null,
      lang:         codeBlock?.lang ?? null,
      filesChanged: codeBlock ? 1 : 0,
      summary:      `${sources.length} web sources cited`,
      sources,
      provider:     completion.provider,
    }
  }

  // ── GENERAL / CODE / BUILD: Direct Gemini answer ──────────
  if (onStatusUpdate) onStatusUpdate('Thinking with Gemini…')

  const messages = [
    ...histMessages,
    { role: 'user', content: prompt },
  ]

  const completion = await callLLM({ systemInstruction: SYSTEM_PERSONA, messages })
  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1)
  const codeBlock = extractCodeBlock(completion.text)

  // Heuristic type labeling for UI badge
  const lower = prompt.toLowerCase()
  const type = lower.includes('build') || lower.includes('website') || lower.includes('html')
    ? 'build'
    : lower.includes('debug') || lower.includes('error') || lower.includes('fix') || lower.includes('bug')
    ? 'debug'
    : 'general'

  return {
    type,
    thought:      `Processed via ${completion.provider} with ${histMessages.length} turns of context.`,
    thoughtTime:  `${(parseFloat(totalElapsed) * 0.3).toFixed(1)}s`,
    workTime:     `${totalElapsed}s`,
    text:         completion.text,
    code:         codeBlock?.code ?? null,
    lang:         codeBlock?.lang ?? null,
    filesChanged: codeBlock ? 1 : 0,
    summary:      null,
    sources:      [],
    provider:     completion.provider,
  }
}
