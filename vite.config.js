import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ─────────────────────────────────────────────────────────────
// PETER TACTIX AI — Secure Backend Handler
// Multi-Key & Multi-Model Rotation Engine
// ─────────────────────────────────────────────────────────────
function aiBackendPlugin() {
  return {
    name: 'ai-backend-plugin',

    // Load .env so process.env is populated for server routes
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      process.env.GEMINI_API_KEY   = process.env.GEMINI_API_KEY   || env.GEMINI_API_KEY   || ''
      process.env.GEMINI_API_KEY_1 = process.env.GEMINI_API_KEY_1 || env.GEMINI_API_KEY_1 || ''
      process.env.GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2 || env.GEMINI_API_KEY_2 || ''
      process.env.OPENAI_API_KEY   = process.env.OPENAI_API_KEY   || env.OPENAI_API_KEY   || ''
    },

    configureServer(server) {
      // ── 1. Live Web Search Endpoint (/api/search) ─────────
      server.middlewares.use('/api/search', async (req, res) => {
        try {
          const url   = new URL(req.url, 'http://localhost')
          const query = url.searchParams.get('q') || ''
          if (!query.trim()) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ results: [] }))
            return
          }

          const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
          const response = await fetch(ddgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
              'Accept': 'text/html,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
          })
          const html    = await response.text()
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

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ query, results }))
        } catch (err) {
          console.error('[/api/search] Error:', err.message)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message, results: [] }))
        }
      })

      // ── 2. Secure Multi-Key & Multi-Model Chat Endpoint (/api/chat) ──
      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', async () => {
          try {
            const { messages = [] } = JSON.parse(body || '{}')

            // ── Locked Server System Persona ──────────────────
            const SYSTEM_INSTRUCTION =
              'You are PETER TACTIX AI, an intelligent, empathetic, and multi-tasking AI workspace built by Peter George Peter. You understand user intent natively. Answer all questions naturally, directly, and accurately.'

            // ── Direct Server Key Verification ───────────────
            const env = loadEnv('development', process.cwd(), '')
            const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''
            const rawKeys = [
              geminiApiKey,
              process.env.GEMINI_API_KEY_1 || env.GEMINI_API_KEY_1 || '',
              process.env.GEMINI_API_KEY_2 || env.GEMINI_API_KEY_2 || '',
            ].filter(k => k && typeof k === 'string' && k.trim().length > 0)

            // Deduplicate keys preserving fallback order (primary GEMINI_API_KEY first)
            const geminiKeys = [...new Set(rawKeys)]

            if (geminiKeys.length === 0) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }))
              return
            }

            // ── Model Fallback Order (gemini-2.5-flash -> gemini-1.5-flash -> modern fallbacks) ──
            const MODEL_FALLBACK_ORDER = [
              'gemini-2.5-flash',
              'gemini-1.5-flash',
              'gemini-3.5-flash',
              'gemini-3.8-flash',
              'gemini-flash-latest',
            ]

            // Format message contents for Gemini
            const contents = messages
              .filter(m => m.role !== 'system' && (m.content || m.text || '').trim())
              .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: (m.content || m.text || '').trim() }],
              }))

            if (contents.length === 0) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'No valid messages provided.' }))
              return
            }

            // ── Multi-Key & Multi-Model Execution ─────────────
            let lastError = null

            for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
              const currentKey = geminiKeys[kIdx]

              try {
                const { GoogleGenAI } = await import('@google/genai')
                const ai = new GoogleGenAI({ apiKey: currentKey })

                for (const model of MODEL_FALLBACK_ORDER) {
                  try {
                    const response = await ai.models.generateContent({
                      model,
                      contents,
                      config: { systemInstruction: SYSTEM_INSTRUCTION },
                    })

                    const reply = response.text || ''
                    if (reply.trim()) {
                      res.setHeader('Content-Type', 'application/json')
                      res.end(
                        JSON.stringify({
                          text: reply.trim(),
                          provider: `Google Gemini (${model})`,
                        })
                      )
                      return
                    }
                  } catch (modelErr) {
                    const errMsg = modelErr.message || ''
                    lastError = errMsg

                    // Rate limit (429) or quota error detection -> switch to next key immediately
                    const isRateLimit =
                      errMsg.includes('429') ||
                      errMsg.includes('RESOURCE_EXHAUSTED') ||
                      errMsg.toLowerCase().includes('quota') ||
                      errMsg.toLowerCase().includes('rate limit')

                    if (isRateLimit) {
                      console.warn(
                        `[/api/chat] Key #${kIdx + 1} hit rate limit / quota. Switching to next key...`
                      )
                      break // Break out of model loop to rotate key
                    }

                    // Otherwise model unavailable (404 / deprecated) -> continue to next model in fallback order
                    console.warn(
                      `[/api/chat] Model ${model} unavailable (${errMsg.slice(0, 60)}...). Trying next model in fallback order...`
                    )
                  }
                }
              } catch (sdkInitErr) {
                console.warn(
                  `[/api/chat] SDK init error with Key #${kIdx + 1}:`,
                  sdkInitErr.message
                )
              }
            }

            // ── Strategy 2: REST Endpoint Fallback with Multi-Key ──
            for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
              const currentKey = geminiKeys[kIdx]

              for (const model of MODEL_FALLBACK_ORDER) {
                try {
                  const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                        contents,
                      }),
                    }
                  )

                  if (geminiRes.status === 429) {
                    console.warn(
                      `[/api/chat REST] Key #${kIdx + 1} returned 429 rate limit. Rotating key...`
                    )
                    break
                  }

                  if (geminiRes.ok) {
                    const data = await geminiRes.json()
                    const reply =
                      data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    if (reply.trim()) {
                      res.setHeader('Content-Type', 'application/json')
                      res.end(
                        JSON.stringify({
                          text: reply.trim(),
                          provider: `Google Gemini REST (${model})`,
                        })
                      )
                      return
                    }
                  }
                } catch (restErr) {
                  lastError = restErr.message
                }
              }
            }

            // When all keys and models in rotation are exhausted
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 502
            res.end(
              JSON.stringify({
                error: lastError || 'All Gemini API keys and failover models were exhausted.',
              })
            )
          } catch (err) {
            console.error('[/api/chat] Fatal error:', err.message)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), aiBackendPlugin()],
})
