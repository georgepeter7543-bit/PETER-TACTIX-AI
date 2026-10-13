/**
 * Live Web Search Service for PETER TACTIX AI
 * Fetches real-time search results (top 3–5 snippets) via the local /api/search
 * endpoint (powered by DuckDuckGo) with resilient fallbacks.
 */

export async function performLiveWebSearch(query) {
  if (!query || !query.trim()) {
    return { query: '', results: [], engine: 'None' }
  }

  const cleanQuery = query.trim()

  // 1. Try local dev server proxy (/api/search)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.results) && data.results.length > 0) {
        return {
          query: cleanQuery,
          results: data.results.slice(0, 5),
          engine: 'DuckDuckGo Live Web',
        }
      }
    }
  } catch (err) {
    console.warn('Local /api/search endpoint unavailable, trying fallback:', err)
  }

  // 2. Resilient fallback to DuckDuckGo Instant Answer API
  try {
    const fallbackRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`
    )
    if (fallbackRes.ok) {
      const ddg = await fallbackRes.json()
      const results = []

      if (ddg.AbstractText && ddg.AbstractURL) {
        results.push({
          title: ddg.Heading || cleanQuery,
          link: ddg.AbstractURL,
          snippet: ddg.AbstractText,
        })
      }

      if (Array.isArray(ddg.RelatedTopics)) {
        for (const topic of ddg.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.slice(0, 60) + (topic.Text.length > 60 ? '...' : ''),
              link: topic.FirstURL,
              snippet: topic.Text,
            })
          }
        }
      }

      if (results.length > 0) {
        return {
          query: cleanQuery,
          results: results.slice(0, 5),
          engine: 'DuckDuckGo Instant Answer',
        }
      }
    }
  } catch (fallbackErr) {
    console.warn('Instant answer fallback error:', fallbackErr)
  }

  return {
    query: cleanQuery,
    results: [],
    engine: 'None',
  }
}
