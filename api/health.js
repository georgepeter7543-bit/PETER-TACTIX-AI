export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    environment: 'vercel-serverless'
  })
}
