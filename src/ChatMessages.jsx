import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ThumbsUp, ThumbsDown,
  RotateCcw, Share2, Volume2, VolumeX, MoreHorizontal, ExternalLink
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
      className={`p-1.5 rounded-lg text-[#8e8e8e] hover:text-white hover:bg-[#212121] transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

// ── react-markdown code renderer ─────────────────────────────
function MarkdownCode({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '')
  const lang  = match ? match[1] : ''
  const code  = String(children).replace(/\n$/, '')

  if (!inline && (lang || code.includes('\n'))) {
    return (
      <div className="relative my-3 rounded-xl overflow-hidden border border-[#2f2f2f] bg-[#0d0d0d] group">
        <div className="flex items-center justify-between px-4 py-2 bg-[#181818] border-b border-[#2f2f2f]">
          <span className="text-[11px] text-[#8e8e8e] font-mono tracking-wide">
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
            background: '#0d0d0d',
            fontSize: '0.82rem',
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
    <code className="bg-[#212121] text-[#f4f4f4] px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
      {children}
    </code>
  )
}

// ── react-markdown component map ─────────────────────────────
const MD_COMPONENTS = {
  code: MarkdownCode,
  h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold text-[#ececec] mt-5 mb-2.5">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg sm:text-xl font-semibold text-[#ececec] mt-4 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-[#ececec] mt-3.5 mb-1.5">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-[#ececec] mt-3 mb-1">{children}</h4>,
  p:  ({ children }) => <p className="leading-relaxed text-[#ececec] my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 my-2.5 text-[#ececec]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-[#ececec]">{children}</ol>,
  li: ({ children }) => <li className="ml-2 leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#555] pl-4 py-1 my-3 text-[#b4b4b4] italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#d49a3d] hover:underline inline-flex items-center gap-0.5 transition-colors"
    >
      {children}
      <ExternalLink size={11} className="inline opacity-60 ml-0.5" />
    </a>
  ),
  hr: () => <hr className="border-[#2f2f2f] my-4" />,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em:     ({ children }) => <em className="italic text-[#d1d5db]">{children}</em>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#1f1f1f] text-[#ececec]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#2f2f2f]">{children}</tbody>,
  tr:    ({ children }) => <tr className="hover:bg-[#181818] transition-colors">{children}</tr>,
  th:    ({ children }) => <th className="px-3 py-2 text-left font-medium text-[#8e8e8e] border border-[#2f2f2f]">{children}</th>,
  td:    ({ children }) => <td className="px-3 py-2 text-[#ececec] border border-[#2f2f2f]">{children}</td>,
}

// ── User Message Card (Warm Tan/Brown Pill matching ChatGPT Reference) ──
export function UserMessage({ message }) {
  const text = message.content || message.text || ''
  return (
    <div className="flex justify-end mb-5 sm:mb-6 animate-in fade-in duration-150">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="bg-[#5a3b1d] text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-3xl text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm">
          {text}
        </div>
      </div>
    </div>
  )
}

// ── Assistant Message Card (Pure ChatGPT Layout on Solid Black) ──
export function AIMessage({ message, onRegenerate }) {
  const [feedback, setFeedback] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const displayText = message.content || message.text || ''

  // Text-To-Speech (Read Aloud)
  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(displayText)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
      setIsSpeaking(true)
    }
  }

  // Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'peter chatbot response', text: displayText }).catch(() => {})
    } else {
      navigator.clipboard.writeText(displayText).catch(() => {})
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col mb-6 sm:mb-8 animate-in fade-in duration-150">
      {/* Message content directly on pure black background without card box */}
      <div className="text-[15px] sm:text-[15.5px] text-[#ececec] leading-relaxed break-words max-w-3xl">
        <ReactMarkdown components={MD_COMPONENTS}>
          {displayText}
        </ReactMarkdown>
      </div>

      {/* ChatGPT-style Action Toolbar directly under message matching screenshot:
          [Copy] [ThumbsDown] [Share] [Speaker/Volume] [Regenerate] [...] */}
      <div className="flex items-center gap-1 mt-2.5 text-[#8e8e8e] select-none">
        {/* Copy button */}
        <CopyButton text={displayText} />

        {/* Thumbs Down button */}
        <button
          onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
          className={`p-1.5 rounded-lg hover:bg-[#212121] transition-colors ${
            feedback === 'down' ? 'text-red-400' : 'hover:text-white'
          }`}
          title="Bad response"
          aria-label="Bad response"
        >
          <ThumbsDown size={14} />
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="p-1.5 rounded-lg hover:text-white hover:bg-[#212121] transition-colors"
          title={shareCopied ? 'Link copied!' : 'Share'}
          aria-label="Share"
        >
          {shareCopied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
        </button>

        {/* Read aloud button */}
        <button
          onClick={toggleSpeech}
          className={`p-1.5 rounded-lg hover:bg-[#212121] transition-colors ${
            isSpeaking ? 'text-[#d49a3d] animate-pulse' : 'hover:text-white'
          }`}
          title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
          aria-label="Read aloud"
        >
          {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {/* Regenerate button */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#212121] transition-colors"
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {/* More options button */}
        <button
          className="p-1.5 rounded-lg hover:text-white hover:bg-[#212121] transition-colors"
          title="More"
          aria-label="More"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Typing / Thinking Indicator ───────────────────────────────
export function TypingIndicator({ status }) {
  return (
    <div className="flex items-center gap-2 py-2 mb-4 animate-in fade-in duration-150">
      <span className="w-2 h-2 rounded-full bg-[#d49a3d] animate-pulse" />
      <span className="text-xs text-[#8e8e8e] font-sans">
        {status || 'Thinking…'}
      </span>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center select-none py-6">
      <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-normal">
        What can peter help you with today?
      </h1>
    </div>
  )
}

export { CopyButton }
