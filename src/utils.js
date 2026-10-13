import { useState, useCallback } from 'react'

// ── Utility helpers ──────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 9)

const MODE_LABELS = {
  debug:   { label: 'Debug',   color: 'text-accent-red' },
  build:   { label: 'Build',   color: 'text-accent-green' },
  general: { label: 'Default', color: 'text-text-secondary' },
}

// ── LocalStorage persistence helpers ──────────────────────────
export const STORAGE_KEY = 'peter_tactix_history'

/**
 * Loads conversation sessions from browser localStorage
 * Returns Array<{ id: string, title: string, timestamp: number, messages: Array }>
 */
export function loadSavedSessions() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('Failed to load conversation history from localStorage:', err)
    return []
  }
}

/**
 * Saves conversation sessions to browser localStorage
 */
export function saveSessionsToStorage(sessions) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.warn('Failed to save conversation history to localStorage:', err)
  }
}

/**
 * Formats a timestamp into human-readable relative string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - Number(timestamp)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Automatically generates a concise title for each new conversation
 * based on the user's first prompt (e.g. "React Navbar Component", "Python Debugging")
 */
export function generateConversationTitle(prompt) {
  if (!prompt || typeof prompt !== 'string') return 'New Conversation'

  // Clean code blocks, markdown symbols, and excess whitespace
  let cleaned = prompt
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_\-\n\r\t]/g, ' ')
    .trim()

  const lower = cleaned.toLowerCase()

  // Intelligent category/keyword matching
  if (lower.includes('debug') || lower.includes('fix') || lower.includes('error') || lower.includes('bug') || lower.includes('broken')) {
    if (lower.includes('react')) return 'React Debugging'
    if (lower.includes('python')) return 'Python Debugging'
    if (lower.includes('javascript') || lower.includes('js')) return 'JavaScript Debugging'
    if (lower.includes('css')) return 'CSS Bug Fix'
    if (lower.includes('html')) return 'HTML Fix'
    return 'Code Debugging'
  }

  if (lower.includes('portfolio')) return 'Portfolio Website'
  if (lower.includes('landing')) return 'Landing Page Design'
  if (lower.includes('website') || lower.includes('web page') || lower.includes('html')) return 'Student Web Builder'
  if (lower.includes('hook') || lower.includes('useeffect') || lower.includes('usestate')) return 'React Hooks Guide'
  if (lower.includes('navbar') || lower.includes('nav')) return 'Navbar Component'
  if (lower.includes('python')) return 'Python Scripting'
  if (lower.includes('tailwind')) return 'Tailwind CSS Layout'
  if (lower.includes('react')) return 'React Development'
  if (lower.includes('css')) return 'CSS Stylesheet'
  if (lower.includes('what can you do') || lower.includes('who are you') || lower.includes('hello')) return 'General Inquiries'

  // Extract first 4-5 words (up to 28 characters)
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 0) {
    const candidate = words.slice(0, 4).join(' ')
    const capitalized = candidate.charAt(0).toUpperCase() + candidate.slice(1)
    return capitalized.length > 28 ? capitalized.slice(0, 26) + '...' : capitalized
  }

  return 'New Conversation'
}

// ── Simple syntax highlighter ────────────────────────────────
function highlightCode(code, lang) {
  if (!lang || lang === 'text') return escapeHtml(code)
  let html = escapeHtml(code)
  // keywords
  const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|new|this|true|false|null|undefined|async|await|try|catch|throw|default|extends|super|typeof|void|in|of|switch|case|break|continue|do)\b/g
  html = html.replace(keywords, '<span class="token-keyword">$1</span>')
  // strings
  html = html.replace(/(&#34;.*?&#34;|&#39;.*?&#39;|`.*?`)/g, '<span class="token-string">$1</span>')
  // comments
  html = html.replace(/(\/\/.*)/g, '<span class="token-comment">$1</span>')
  // numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>')
  // functions
  html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="token-function">$1</span>')
  return html
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;')
}

// ── Markdown renderer ────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  let html = escapeHtml(text)

  // Fenced code blocks ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<div class="code-block my-2.5 rounded-lg overflow-hidden border border-[#2a2d35]"><div class="flex items-center justify-between px-3 py-1 bg-[#0f1117] border-b border-[#2a2d35]"><span class="text-[11px] text-[#8b95a5] font-mono">${lang || 'code'}</span></div><pre class="p-3.5 overflow-x-auto text-xs leading-relaxed font-mono text-[#c9d1d9] bg-[#0b0d13]"><code>${code}</code></pre></div>`
  })

  // Markdown links: [label](url) -> <a href="url" target="_blank" rel="noopener noreferrer">label ↗</a>
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#4f8ef7] hover:underline font-medium inline-flex items-center gap-0.5">$1 <span class="text-[10px] text-[#4f8ef7]/70">↗</span></a>'
  )

  // Blockquotes: &gt; Quote
  html = html.replace(
    /^&gt;\s*(.+)$/gm,
    '<blockquote class="border-l-2 border-[#4f8ef7] pl-3 py-1 my-2 text-xs text-[#94a3b8] bg-[#111622] rounded-r">$1</blockquote>'
  )

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-[#1e2028] text-accent-blue px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
  )

  // Headers
  html = html.replace(/^#{3}\s(.+)$/gm, '<h3 class="text-base font-semibold text-text-primary mt-3.5 mb-1">$1</h3>')
  html = html.replace(/^#{2}\s(.+)$/gm, '<h2 class="text-lg font-semibold text-text-primary mt-4 mb-1.5">$1</h2>')
  html = html.replace(/^#{1}\s(.+)$/gm, '<h1 class="text-xl font-bold text-text-primary mt-4 mb-2">$1</h1>')

  // List items
  html = html.replace(/^[-*]\s(.+)$/gm, '<li class="ml-4 list-disc text-text-secondary my-0.5 leading-relaxed">$1</li>')

  // Paragraph breaks
  html = html.replace(/\n\n/g, '</p><p class="mt-2.5">')
  return `<p>${html}</p>`
}

export {
  generateId,
  highlightCode,
  renderMarkdown,
  MODE_LABELS,
}
