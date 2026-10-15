import { GoogleGenAI } from '@google/genai'

const SYSTEM_PERSONA =
  'You are PETER TACTIX AI, an intelligent, empathetic, and multi-tasking AI workspace built by Peter George Peter. You understand user intent natively. Answer all questions naturally, directly, and accurately.'

const MODEL_FALLBACK_ORDER = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
]

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const primaryApiKey = (process.env.GEMINI_API_KEY || '').trim()
  if (!primaryApiKey) {
    return res.status(500).json({ error: 'Server API Key not configured' })
  }

  const rawKeys = [
    primaryApiKey,
    (process.env.GEMINI_API_KEY_1 || '').trim(),
    (process.env.GEMINI_API_KEY_2 || '').trim(),
  ].filter(Boolean)
  const geminiKeys = [...new Set(rawKeys)]

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = { message: body } }
  }
  body = body || {}

  const { messages = [], message, prompt, systemInstruction } = body
  const systemPrompt = (typeof systemInstruction === 'string' && systemInstruction.trim())
    ? systemInstruction
    : SYSTEM_PERSONA

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

  let lastError = null

  for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
    const currentKey = geminiKeys[kIdx]

    for (const model of MODEL_FALLBACK_ORDER) {
      try {
        const ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: { timeout: 30000 },
        })

        const response = await ai.models.generateContent({
          model,
          contents: formattedContents,
          config: { systemInstruction: systemPrompt },
        })

        const replyText = (response.text || '').trim()
        if (replyText) {
          return res.status(200).json({
            reply: replyText,
            text: replyText,
            provider: `Google Gemini (${model})`,
          })
        }
      } catch (modelErr) {
        lastError = modelErr.message || 'Model error'
        const errMsg = modelErr.message || ''
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('rate limit')

        if (isRateLimit && geminiKeys.length > 1) {
          break
        }
      }
    }
  }

  const isAuthError =
    lastError &&
    (lastError.includes('API_KEY_INVALID') ||
      lastError.includes('API key not valid') ||
      lastError.includes('UNAUTHENTICATED'))

  return res.status(500).json({
    error: isAuthError
      ? 'Server API Key not configured or invalid'
      : lastError || 'All Gemini models exhausted',
  })
}
