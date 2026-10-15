// ─────────────────────────────────────────────────────────────
// PETER TACTIX AI — Backend Server
// Express + Google GenAI  |  Port 5000
// ─────────────────────────────────────────────────────────────

// IMPORTANT: dotenv must load before any code reads process.env.
// Using the ESM-native import side-effect pattern keeps this reliable
// regardless of import-hoisting order in the module graph.
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

// ── Validate API key at boot — fail fast ─────────────────────
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim()
if (!GEMINI_API_KEY) {
  console.error('[PETER TACTIX AI] FATAL: GEMINI_API_KEY is not set in .env — server cannot start.')
  process.exit(1)
}

const app  = express()
const PORT = Number(process.env.PORT) || 5000

// ── Middleware ────────────────────────────────────────────────
// CORS must come first so preflight OPTIONS requests are handled
// before any route — otherwise browsers get a 404 on OPTIONS.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
// Parse JSON bodies; also accept text/plain fallback in case the
// client omits the Content-Type header.
app.use(express.json({ limit: '10mb', strict: false }))
app.use(express.text({ type: 'text/plain', limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Request logger (visible in terminal for both server & proxy)
app.use((req, _res, next) => {
  console.log(`[PETER TACTIX AI] ▶ ${req.method} ${req.originalUrl}  body-keys: ${Object.keys(req.body || {}).join(', ') || '(none)'}`)
  next()
})

// ── System Persona ───────────────────────────────────────────
const SYSTEM_PERSONA =
  'You are PETER TACTIX AI, an intelligent, empathetic, and multi-tasking AI workspace built by Peter George Peter. You understand user intent natively. Answer all questions naturally, directly, and accurately.'

// ── Model fallback order ─────────────────────────────────────
// Ordered from most-preferred to least-preferred.
// gemini-2.5-flash and gemini-1.5-flash are 404 for this API key,
// so we start with the confirmed-working models first.
const MODEL_FALLBACK_ORDER = [
  'gemini-3.1-flash-lite',   // ✔ confirmed working — fastest first
  'gemini-3.5-flash',        // ✔ fallback
  'gemini-3.8-flash',        // ✔ fallback (may occasionally 503)
  'gemini-flash-latest',     // ✔ alias fallback
  'gemini-2.5-flash',        // kept for future key upgrades
  'gemini-1.5-flash',        // kept for future key upgrades
]

// ── Multi-key pool (de-duplicated) ───────────────────────────
const GEMINI_KEYS = [...new Set([
  GEMINI_API_KEY,
  (process.env.GEMINI_API_KEY_1 || '').trim(),
  (process.env.GEMINI_API_KEY_2 || '').trim(),
].filter(Boolean))]

// ── Helper: call Gemini with a single key + model ─────────────
async function callGemini(apiKey, model, contents, systemPrompt) {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30_000 } })
  const response = await ai.models.generateContent({
    model,
    contents,
    config: { systemInstruction: systemPrompt },
  })
  return (response.text || '').trim()
}

// ── GET /api/health ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    port:      PORT,
    hasApiKey: Boolean(GEMINI_API_KEY),
    models:    MODEL_FALLBACK_ORDER,
    keys:      GEMINI_KEYS.length,
  })
})

// ── GET /api/search  (DuckDuckGo web scrape) ─────────────────
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  if (!query) return res.json({ query: '', results: [] })

  try {
    const ddgUrl  = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const htmlRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        Accept:            'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10_000),
    })
    const html    = await htmlRes.text()
    const results = []
    const regex   = /class="result__title"[\s\S]*?class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    let match

    while ((match = regex.exec(html)) !== null && results.length < 5) {
      let link = match[1]
      const uddg = link.match(/uddg=([^&]+)/)
      if (uddg) link = decodeURIComponent(uddg[1])
      const title   = match[2].replace(/<[^>]+>/g, '').trim()
      const snippet = match[3].replace(/<[^>]+>/g, '').trim()
      if (title && snippet) results.push({ title, link, snippet })
    }

    res.json({ query, results })
  } catch (err) {
    console.error('[/api/search] Error:', err.message)
    res.json({ query, results: [] })
  }
})

// ── POST /api/chat  (Gemini AI) ──────────────────────────────
app.post('/api/chat', async (req, res) => {
  console.log('[/api/chat] ▶ Incoming request — body type:', typeof req.body)

  try {
    // ── Parse body (handles JSON object, raw string, or missing CT-header)
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = { message: body } }
    }
    body = body || {}

    const { messages = [], message, prompt, systemInstruction } = body
    const systemPrompt = (typeof systemInstruction === 'string' && systemInstruction.trim())
      ? systemInstruction
      : SYSTEM_PERSONA

    // ── Build contents array for Gemini SDK ──────────────────
    let formattedContents = []

    if (Array.isArray(messages) && messages.length > 0) {
      formattedContents = messages
        .filter(m => m.role !== 'system' && (m.content || m.text || '').trim())
        .map(m => ({
          role:  m.role === 'user' ? 'user' : 'model',
          parts: [{ text: (m.content || m.text || '').trim() }],
        }))
    } else if (typeof message === 'string' && message.trim()) {
      formattedContents = [{ role: 'user', parts: [{ text: message.trim() }] }]
    } else if (typeof prompt === 'string' && prompt.trim()) {
      formattedContents = [{ role: 'user', parts: [{ text: prompt.trim() }] }]
    }

    if (formattedContents.length === 0) {
      console.warn('[/api/chat] ✗ No message content found in request body')
      return res.status(500).json({ error: 'No message provided' })
    }

    console.log(`[/api/chat] ▶ ${formattedContents.length} turn(s), last role: ${formattedContents.at(-1)?.role}`)

    // ── Multi-key × multi-model execution ────────────────────
    let lastError = null

    for (let kIdx = 0; kIdx < GEMINI_KEYS.length; kIdx++) {
      const currentKey = GEMINI_KEYS[kIdx]

      for (const model of MODEL_FALLBACK_ORDER) {
        try {
          console.log(`[/api/chat] ▶ Trying key #${kIdx + 1} / model: ${model}`)
          const replyText = await callGemini(currentKey, model, formattedContents, systemPrompt)

          if (replyText) {
            console.log(`[/api/chat] ✔ Success via ${model} — ${replyText.length} chars`)
            return res.json({
              reply:    replyText,
              text:     replyText,
              provider: `Google Gemini (${model})`,
            })
          }

          console.warn(`[/api/chat] ✗ ${model} returned empty text — trying next`)
        } catch (modelErr) {
          const errMsg = (modelErr.message || '').slice(0, 120)
          lastError    = modelErr.message || errMsg

          const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') ||
                              errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit')
          const isUnavailable = errMsg.includes('503') || errMsg.toLowerCase().includes('unavailable')
          const isNotFound    = errMsg.includes('404') || errMsg.toLowerCase().includes('not found')

          if (isRateLimit) {
            console.warn(`[/api/chat] ✗ Rate limit on key #${kIdx + 1} / ${model} — rotating key`)
            break  // move to next key
          } else if (isNotFound) {
            console.warn(`[/api/chat] ✗ ${model} not available for this key (404) — skipping`)
          } else if (isUnavailable) {
            console.warn(`[/api/chat] ✗ ${model} temporarily unavailable (503) — trying next`)
          } else {
            console.warn(`[/api/chat] ✗ ${model} error: ${errMsg}`)
          }
        }
      }
    }

    // All keys + models exhausted
    const isAuthError = lastError &&
      (lastError.includes('API_KEY_INVALID') ||
       lastError.includes('API key not valid') ||
       lastError.includes('UNAUTHENTICATED'))

    const errorMessage = isAuthError
      ? 'Server API Key not configured or invalid'
      : lastError || 'All Gemini models exhausted — please try again'

    console.error('[/api/chat] ✗ All models failed. Last error:', lastError)
    return res.status(500).json({ error: errorMessage })

  } catch (routeErr) {
    console.error('[/api/chat] ✗ Unhandled route error:', routeErr)
    return res.status(500).json({ error: routeErr.message || 'Backend service error' })
  }
})

// ── 404 catch-all — logs the unmatched path to the terminal ──
app.use((req, res) => {
  console.warn(`[PETER TACTIX AI] 404 — No route: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ── Global async error handler (Express 5 auto-forwards) ─────
app.use((err, _req, res, _next) => {
  console.error('[PETER TACTIX AI] Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════')
  console.log(`  PETER TACTIX AI backend  →  http://localhost:${PORT}`)
  console.log(`  Routes: GET /api/health | GET /api/search | POST /api/chat`)
  console.log(`  API keys loaded: ${GEMINI_KEYS.length} | Models: ${MODEL_FALLBACK_ORDER.length}`)
  console.log('═══════════════════════════════════════════════════')
})
