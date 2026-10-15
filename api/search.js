export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const query = (req.query.q || '').trim()
  if (!query) return res.status(200).json({ query: '', results: [] })

  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const htmlRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        Accept: 'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10_000),
    })
    const html = await htmlRes.text()
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

    res.status(200).json({ query, results })
  } catch (err) {
    res.status(200).json({ query, results: [] })
  }
}
