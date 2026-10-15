import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('dotenv').config()

import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── System Persona ───────────────────────────────────────────
const SYSTEM_PERSONA =
  'You are PETER TACTIX AI, an intelligent, empathetic, and multi-tasking AI workspace built by Peter George Peter. You understand user intent natively. Answer all questions naturally, directly, and accurately.'

// Model fallback order: attempt gemini-2.5-flash first, then fall back to gemini-1.5-flash, then resilient fallbacks
const MODEL_FALLBACK_ORDER = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
]

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, hasApiKey: Boolean(process.env.GEMINI_API_KEY) })
})

// ── Live Web Search Endpoint (/api/search) ───────────────────
app.get('/api/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim()
    if (!query) {
      return res.json({ query: '', results: [] })
    }

    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        Accept: 'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    const html = await response.text()
    const results = []
    const regex =
      /class="result__title"[\s\S]*?class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    let match

    while ((match = regex.exec(html)) !== null && results.length < 5) {
      let link = match[1]
      const uddg = link.match(/uddg=([^&]+)/)
      if (uddg) link = decodeURIComponent(uddg[1])
      const title = match[2].replace(/<[^>]+>/g, '').trim()
      const snippet = match[3].replace(/<[^>]+>/g, '').trim()
      if (title && snippet) results.push({ title, link, snippet })
    }

    res.json({ query, results })
  } catch (err) {
    console.error('[/api/search] Error:', err.message)
    res.json({ query: req.query.q || '', results: [] })
  }
})

// ── POST /api/chat — Secure Gemini Chat Route ────────────────
app.post('/api/chat', async (req, res) => {
  try {
    // 1. Direct Server Key Verification
    const primaryApiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!primaryApiKey) {
      return res.status(500).json({ error: 'Server API Key not configured' })
    }

    // Multi-key rotation support (primary GEMINI_API_KEY first)
    const rawKeys = [
      primaryApiKey,
      (process.env.GEMINI_API_KEY_1 || '').trim(),
      (process.env.GEMINI_API_KEY_2 || '').trim(),
    ].filter(Boolean)
    const geminiKeys = [...new Set(rawKeys)]

    // 2. Parse Messages & Instructions
    const { messages = [], message, prompt, systemInstruction } = req.body || {}
    const systemPrompt = systemInstruction || SYSTEM_PERSONA

    let formattedContents = []
    if (Array.isArray(messages) && messages.length > 0) {
      formattedContents = messages
        .filter(m => m.role !== 'system' && (m.content || m.text || '').trim())
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: (m.content || m.text || '').trim() }],
        }))
    } else if (typeof message === 'string' && message.trim()) {
      formattedContents = [{ role: 'user', parts: [{ text: message.trim() }] }]
    } else if (typeof prompt === 'string' && prompt.trim()) {
      formattedContents = [{ role: 'user', parts: [{ text: prompt.trim() }] }]
    }

    if (formattedContents.length === 0) {
      return res.status(500).json({ error: 'No message provided' })
    }

    // 3. Multi-Key & Multi-Model Execution
    let lastError = null

    for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
      const currentKey = geminiKeys[kIdx]

      try {
        const ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: { timeout: 15000 },
        })

        for (const model of MODEL_FALLBACK_ORDER) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: formattedContents,
              config: { systemInstruction: systemPrompt },
            })

            const replyText = (response.text || '').trim()
            if (replyText) {
              return res.json({
                reply: replyText,
                text: replyText,
                provider: `Google Gemini (${model})`,
              })
            }
          } catch (modelErr) {
            const errMsg = modelErr.message || ''
            lastError = errMsg

            // Detect rate limits (429 / quota / 503) to rotate or fallback
            const isRateLimit =
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.toLowerCase().includes('quota') ||
              errMsg.toLowerCase().includes('rate limit')

            if (isRateLimit) {
              console.warn(
                `[/api/chat] Key #${kIdx + 1} hit rate limit / quota on ${model}. Switching to next key/model...`
              )
              if (geminiKeys.length > 1) {
                break
              }
            } else {
              console.warn(
                `[/api/chat] Model ${model} unavailable (${errMsg.slice(0, 60)}...). Trying next model...`
              )
            }
          }
        }
      } catch (sdkInitErr) {
        console.warn(`[/api/chat] SDK init error on Key #${kIdx + 1}:`, sdkInitErr.message)
        lastError = sdkInitErr.message
      }
    }

    // 4. Return status 500 error on failure
    const isAuthError =
      lastError &&
      (lastError.includes('API_KEY_INVALID') ||
        lastError.includes('API key not valid') ||
        lastError.includes('UNAUTHENTICATED'))

    return res.status(500).json({
      error: isAuthError
        ? 'Server API Key not configured'
        : lastError || 'Backend service error message',
    })
  } catch (routeErr) {
    console.error('[/api/chat] Server error:', routeErr)
    return res.status(500).json({
      error: routeErr.message || 'Backend service error message',
    })
  }
})

// ── Catch-All: Log & Return 404 for Unmatched Routes ────────
app.use((req, res) => {
  console.warn(`[PETER TACTIX AI] 404 — No route matched: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[PETER TACTIX AI] Unhandled server error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[PETER TACTIX AI] Backend server running on http://localhost:${PORT}`)
  console.log(`[PETER TACTIX AI] Routes: GET /api/health, GET /api/search, POST /api/chat`)
})
