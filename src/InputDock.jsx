import { useRef, useEffect, useCallback } from 'react'
import {
  Send, Mic, MicOff, ChevronDown, AtSign, Slash,
  AlertCircle, X
} from 'lucide-react'
import { MODE_LABELS } from './utils.js'
import { useSpeechRecognition } from './useSpeechRecognition.js'

export default function InputDock({
  value,
  onChange,
  onSend,
  mode,
  onModeChange,
  isThinking,
}) {
  const ref = useRef(null)
  const textBeforeSpeechRef = useRef('')

  // Handle live transcript stream from SpeechRecognition
  const handleTranscript = useCallback((transcriptText, isFinal) => {
    const base = textBeforeSpeechRef.current.trim()
    const combined = base ? `${base} ${transcriptText}` : transcriptText
    onChange(combined)
    if (isFinal) {
      textBeforeSpeechRef.current = combined
    }
  }, [onChange])

  // Custom hook with comprehensive lifecycle and error guardrails
  const {
    isListening,
    isSupported,
    errorMessage,
    clearError,
    toggleListening,
  } = useSpeechRecognition({ onTranscript: handleTranscript })

  // Auto-dismiss transient speech errors after 7 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        clearError()
      }, 7000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, clearError])

  // Auto-resize textarea to content
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 180) + 'px'
    }
  }, [value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handleMicClick = () => {
    if (!isListening) {
      textBeforeSpeechRef.current = value || ''
    }
    toggleListening()
  }

  const modes = Object.entries(MODE_LABELS)

  return (
    <div className="border-t border-[#2a2d35] bg-[#0d0e11] px-4 py-3">
      {/* Speech Recognition Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-lg bg-[#2b1616] border border-[#f87171]/40 text-xs text-[#fca5a5] animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={14} className="text-[#f87171] flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 rounded hover:bg-[#3d1f1f] text-[#fca5a5] hover:text-white transition-colors flex-shrink-0 ml-2"
            title="Dismiss notification"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="relative flex flex-col bg-[#111318] border border-[#2a2d35] rounded-xl overflow-hidden focus-within:border-[#3a3f4a] transition-colors">
        {/* Textarea */}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={isListening ? "Listening to your voice..." : "Ask anything, @ to mention, / for actions"}
          disabled={isThinking}
          className="w-full bg-transparent text-sm text-[#e2e8f0] placeholder-[#4a5568] px-4 pt-3 pb-2 resize-none outline-none leading-relaxed scrollbar-thin disabled:opacity-50"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
          {/* Mention & Actions hint icons */}
          <button className="p-1.5 rounded text-[#4a5568] hover:text-[#8b95a5] hover:bg-[#1e2028] transition-colors" title="Mention (@)">
            <AtSign size={14} />
          </button>
          <button className="p-1.5 rounded text-[#4a5568] hover:text-[#8b95a5] hover:bg-[#1e2028] transition-colors" title="Actions (/)">
            <Slash size={14} />
          </button>

          {/* Model indicator */}
          <div
            className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-md bg-[#1a1d24] border border-[#2a2d35] text-xs text-[#8b95a5] select-none"
            title="PETER TACTIX AI — Secure Gemini Backend Active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            <span className="font-mono text-[11px] text-[#c9d1d9]">Gemini Core</span>
          </div>

          {/* Mode selector */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1d24] border border-[#2a2d35] text-xs text-[#8b95a5] hover:text-[#e2e8f0] hover:border-[#3a3f4a] transition-colors">
              <span className={MODE_LABELS[mode]?.color || 'text-text-secondary'}>
                {MODE_LABELS[mode]?.label || 'Default'}
              </span>
              <ChevronDown size={11} />
            </button>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex flex-col bg-[#1a1d24] border border-[#2a2d35] rounded-lg overflow-hidden shadow-xl z-10 min-w-[120px]">
              {modes.map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => onModeChange(key)}
                  className={`px-3 py-2 text-xs text-left hover:bg-[#2a2d35] transition-colors ${mode === key ? 'bg-[#2a2d35]' : ''} ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Listening Indicator */}
          {isListening && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Listening...</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Voice Microphone Input with Guardrails */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={!isSupported || isThinking}
            className={`p-1.5 rounded transition-all duration-150 ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm shadow-red-500/20'
                : isSupported
                ? 'text-[#4a5568] hover:text-[#8b95a5] hover:bg-[#1e2028]'
                : 'text-[#32363e] cursor-not-allowed opacity-50'
            }`}
            title={
              !isSupported
                ? 'Speech recognition not supported in this browser'
                : isListening
                ? 'Listening... Click to stop'
                : 'Voice input (Click to speak)'
            }
          >
            {isListening ? (
              <MicOff size={14} className="animate-pulse" />
            ) : (
              <Mic size={14} />
            )}
          </button>

          {/* Send */}
          <button
            onClick={onSend}
            disabled={!value.trim() || isThinking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4f8ef7] hover:bg-[#5a96f8] text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} />
            <span>Send</span>
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#2a2d35] mt-2">
        PETER TACTIX AI · Press Enter to send, Shift+Enter for newline
      </p>
    </div>
  )
}
