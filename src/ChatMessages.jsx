import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown,
  RotateCcw, GitCompare, FileCode2, User, Bot,
  Globe, Sparkles, ExternalLink,
} from 'lucide-react'

// ── Copy button ──────────────────────────────────────────────
function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

// ── react-markdown code renderer ─────────────────────────────
function MarkdownCode({ node, inline, className, children, ...props }) {
  const match  = /language-(\w+)/.exec(className || '')
  const lang   = match ? match[1] : ''
  const code   = String(children).replace(/\n$/, '')

  if (!inline && (lang || code.includes('\n'))) {
    return (
      <div className="relative my-3 rounded-xl overflow-hidden border border-[#2a2d35] group">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0d0f14] border-b border-[#2a2d35]">
          <span className="text-[11px] text-[#8b95a5] font-mono tracking-wide">
            {lang || 'code'}
          </span>
          <CopyButton text={code} />
        </div>
        <SyntaxHighlighter
          style={oneDark}
          language={lang || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: '#0b0d13',
            fontSize: '0.76rem',
            lineHeight: 1.6,
            padding: '1rem',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <code className="bg-[#1e2028] text-[#60a5fa] px-1.5 py-0.5 rounded text-[0.78em] font-mono" {...props}>
      {children}
    </code>
  )
}

// ── react-markdown component map ─────────────────────────────
const MD_COMPONENTS = {
  code: MarkdownCode,
  // headings
  h1: ({ children }) => <h1 className="text-xl font-bold text-[#e2e8f0] mt-5 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-[#e2e8f0] mt-4 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-[#c9d1d9] mt-3.5 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-[#c9d1d9] mt-3 mb-1">{children}</h4>,
  // paragraphs
  p: ({ children }) => <p className="leading-relaxed text-[#c9d1d9] my-2">{children}</p>,
  // lists
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#c9d1d9]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#c9d1d9]">{children}</ol>,
  li: ({ children }) => <li className="ml-3 leading-relaxed">{children}</li>,
  // blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#4f8ef7] pl-4 py-1 my-3 text-[#94a3b8] bg-[#111622] rounded-r-lg text-sm italic">
      {children}
    </blockquote>
  ),
  // links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#4f8ef7] hover:underline hover:text-[#7aabff] inline-flex items-center gap-0.5 transition-colors"
    >
      {children}
      <ExternalLink size={11} className="inline opacity-60" />
    </a>
  ),
  // horizontal rule
  hr: () => <hr className="border-[#2a2d35] my-4" />,
  // strong / em
  strong: ({ children }) => <strong className="font-semibold text-[#e2e8f0]">{children}</strong>,
  em:     ({ children }) => <em className="italic text-[#94a3b8]">{children}</em>,
  // table
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#1a1d24] text-[#c9d1d9]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#2a2d35]">{children}</tbody>,
  tr:    ({ children }) => <tr className="hover:bg-[#1a1c22] transition-colors">{children}</tr>,
  th:    ({ children }) => <th className="px-3 py-2 text-left font-medium text-[#8b95a5] border border-[#2a2d35]">{children}</th>,
  td:    ({ children }) => <td className="px-3 py-2 text-[#c9d1d9] border border-[#2a2d35]">{children}</td>,
}

// ── Collapsible thought step ─────────────────────────────────
function ThoughtStep({ label, time, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="my-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11px] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
      >
        <div className="w-3.5 h-3.5 rounded-full border border-[#4f8ef7]/50 flex items-center justify-center flex-shrink-0">
          {open ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
        </div>
        <span className="font-medium">{label}</span>
        {time && <span className="text-[#4a5568]">{time} ›</span>}
      </button>
      {open && children && (
        <div className="ml-5 mt-1.5 pl-3 border-l border-[#2a2d35] text-[11px] text-[#8b95a5] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

// ── User message card ────────────────────────────────────────
export function UserMessage({ message }) {
  const text = message.content || message.text || ''
  return (
    <div className="message-enter flex gap-3 justify-end mb-5">
      <div className="max-w-[78%]">
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
          <span className="text-[10px] text-[#4a5568]">{message.time || 'Just now'}</span>
          <User size={10} className="text-[#4a5568]" />
        </div>
      </div>
    </div>
  )
}

// ── AI response card ─────────────────────────────────────────
export function AIMessage({ message }) {
  const [liked, setLiked] = useState(null)
  const displayText = message.content || message.text || ''

  return (
    <div className="message-enter mb-7">
      {/* Agent label row */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#34d399] flex items-center justify-center flex-shrink-0">
          <Bot size={11} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-[#4f8ef7]">PETER TACTIX AI</span>

        {message.type === 'search' && (
          <span className="flex items-center gap-1 text-[10px] text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 px-1.5 py-0.5 rounded-full font-mono">
            <Globe size={10} />
            Live Web
          </span>
        )}

        {message.provider && (
          <span className="text-[10px] text-[#4a5568] font-mono ml-1 hidden sm:inline truncate max-w-[140px]">
            via {message.provider}
          </span>
        )}

        <span className="text-[10px] text-[#4a5568] ml-auto flex-shrink-0">
          {message.time || 'Just now'}
        </span>
      </div>

      {/* Thought steps */}
      {message.thought && (
        <div className="mb-3 rounded-lg p-2.5 bg-[#0f1117] border border-[#2a2d35]/60">
          <ThoughtStep label={`Thought for ${message.thoughtTime || '—'}`} time={message.thoughtTime}>
            <p>{message.thought}</p>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#2a2d35] space-y-1">
                <p className="font-medium text-[#c9d1d9]">Retrieved Sources:</p>
                {message.sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#4f8ef7] hover:underline"
                  >
                    <ExternalLink size={10} />
                    <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </div>
            )}
          </ThoughtStep>
          {message.workTime && (
            <ThoughtStep label={`Worked for ${message.workTime}`} time={message.workTime}>
              <p>Context grounded, validated sources, formatted output.</p>
            </ThoughtStep>
          )}
        </div>
      )}

      {/* Main markdown body — rendered with react-markdown */}
      {displayText && (
        <div className="text-sm prose-invert max-w-none">
          <ReactMarkdown components={MD_COMPONENTS}>
            {displayText}
          </ReactMarkdown>
        </div>
      )}

      {/* Footer action bar */}
      <div className="flex items-center gap-2.5 mt-3 pt-2 border-t border-[#2a2d35]/50 flex-wrap">
        {/* Sources pill */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#4f8ef7] bg-[#4f8ef7]/10 border border-[#4f8ef7]/30 px-2 py-0.5 rounded">
            <Globe size={11} />
            <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''} cited</span>
          </div>
        )}

        {/* Files changed badge */}
        {message.filesChanged > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#8b95a5] bg-[#1a1d24] px-2 py-1 rounded border border-[#2a2d35]">
            <FileCode2 size={11} />
            <span>{message.filesChanged} file changed</span>
            <span className="text-[#34d399]">+{message.filesChanged}</span>
            <span className="text-[#f87171]">-0</span>
          </div>
        )}
        {message.filesChanged > 0 && (
          <button className="flex items-center gap-1 text-xs text-[#8b95a5] hover:text-[#e2e8f0] border border-[#2a2d35] px-2 py-1 rounded hover:bg-[#1e2028] transition-colors">
            <GitCompare size={11} />
            Review
          </button>
        )}

        {/* Copy full response */}
        <CopyButton
          text={displayText}
          className="ml-0 text-[#4a5568] hover:text-[#8b95a5] hover:bg-[#1e2028]"
        />

        {/* Feedback */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setLiked(true)}
            className={`p-1.5 rounded hover:bg-[#1e2028] transition-colors ${liked === true ? 'text-[#34d399]' : 'text-[#4a5568] hover:text-[#8b95a5]'}`}
            title="Helpful"
          >
            <ThumbsUp size={12} />
          </button>
          <button
            onClick={() => setLiked(false)}
            className={`p-1.5 rounded hover:bg-[#1e2028] transition-colors ${liked === false ? 'text-[#f87171]' : 'text-[#4a5568] hover:text-[#8b95a5]'}`}
            title="Not helpful"
          >
            <ThumbsDown size={12} />
          </button>
          <button
            className="p-1.5 rounded hover:bg-[#1e2028] text-[#4a5568] hover:text-[#8b95a5] transition-colors"
            title="Retry"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Typing / thinking indicator ───────────────────────────────
export function TypingIndicator({ status }) {
  return (
    <div className="flex items-center gap-2 mb-5 message-enter">
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#34d399] flex items-center justify-center flex-shrink-0 animate-pulse">
        <Bot size={11} className="text-white" />
      </div>
      <div className="flex items-center gap-3 bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-1.5 h-1.5 bg-[#4f8ef7] rounded-full" />
          <span className="typing-dot w-1.5 h-1.5 bg-[#4f8ef7] rounded-full" />
          <span className="typing-dot w-1.5 h-1.5 bg-[#4f8ef7] rounded-full" />
        </div>
        {status && (
          <div className="flex items-center gap-1.5 border-l border-[#2a2d35] pl-3 text-xs text-[#8b95a5]">
            {status.toLowerCase().includes('search') ? (
              <Globe size={13} className="text-[#4f8ef7] animate-spin" />
            ) : status.toLowerCase().includes('synthesi') || status.toLowerCase().includes('analy') ? (
              <Sparkles size={13} className="text-[#34d399] animate-pulse" />
            ) : (
              <Bot size={13} className="text-[#4f8ef7] animate-pulse" />
            )}
            <span className="font-mono text-[11px] text-[#c9d1d9]">{status}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ onQuickAction }) {
  const actions = [
    {
      label:  '👋 Say hello',
      prompt: 'Hey! What can you help me with?',
    },
    {
      label:  '🌐 Latest AI news today',
      prompt: 'What is the latest news in AI and machine learning today?',
    },
    {
      label:  '🐛 Debug my code',
      prompt:
        'Fix this broken JavaScript:\n```js\nconsole.log("Hello"\nvar x = 5\nif (x == "5") { console.log("loose eq") }\n```',
    },
    {
      label:  '⚡ Build a portfolio site',
      prompt: 'Build me a responsive student portfolio website with a dark theme',
    },
    {
      label:  '🧠 Explain React hooks',
      prompt: 'Explain React hooks like useState, useEffect, and useCallback with practical examples',
    },
    {
      label:  '✍️ Help me write',
      prompt: 'Help me write a professional email requesting a project deadline extension',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4f8ef7] to-[#34d399] flex items-center justify-center mb-5 shadow-lg shadow-[#4f8ef7]/20">
        <Bot size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-[#e2e8f0] mb-2">PETER TACTIX AI</h2>
      <p className="text-sm text-[#8b95a5] mb-8 max-w-sm leading-relaxed">
        Powered by Google Gemini. Ask me anything — code, life advice, web search, creative writing, or technical analysis.
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => onQuickAction(a.prompt)}
            className="text-left text-xs text-[#8b95a5] hover:text-[#e2e8f0] bg-[#111318] hover:bg-[#1e2028] border border-[#2a2d35] hover:border-[#3a3f4a] rounded-xl px-3.5 py-3 transition-all duration-150"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { CopyButton }
