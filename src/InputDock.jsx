import { useRef, useEffect, useCallback, useState } from 'react'
import {
  Plus, Mic, MicOff, ArrowUp, Brain, X, FileText, AlertCircle
} from 'lucide-react'
import { useSpeechRecognition } from './useSpeechRecognition.js'

export default function InputDock({
  value,
  onChange,
  onSend,
  isThinking,
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  placeholder = 'Ask peter...',
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const textBeforeSpeechRef = useRef('')
  const [thinkMode, setThinkMode] = useState(false)

  // Handle live transcript stream from SpeechRecognition
  const handleTranscript = useCallback((transcriptText, isFinal) => {
    const base = textBeforeSpeechRef.current.trim()
    const combined = base ? `${base} ${transcriptText}` : transcriptText
    onChange(combined)
    if (isFinal) {
      textBeforeSpeechRef.current = combined
    }
  }, [onChange])

  const {
    isListening,
    isSupported,
    errorMessage,
    clearError,
    toggleListening,
  } = useSpeechRecognition({ onTranscript: handleTranscript })

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => clearError(), 6000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, clearError])

  // Auto-resize textarea to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
    }
  }, [value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((value.trim() || attachments.length > 0) && !isThinking) {
        onSend()
      }
    }
  }

  const handleMicClick = () => {
    if (!isListening) {
      textBeforeSpeechRef.current = value || ''
    }
    toggleListening()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && onAddAttachments) {
      onAddAttachments(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const hasText = value.trim().length > 0 || attachments.length > 0
  const canSend = hasText && !isThinking

  return (
    <div className="w-full">
      {/* Speech error toast */}
      {errorMessage && (
        <div className="flex items-center justify-between px-3.5 py-1.5 mb-2 rounded-full bg-[#2a1717] border border-red-500/30 text-xs text-red-300">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 text-red-400 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ChatGPT Input Pill Container */}
      <div className="relative flex flex-col bg-[#212121] border border-[#2f2f2f] rounded-3xl p-1.5 sm:p-2 shadow-2xl transition-all focus-within:border-[#444444]">
        {/* Attachment badges */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-1.5 pb-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a2a2a] border border-[#383838] text-xs text-[#ececec]"
              >
                <FileText size={12} className="text-[#d49a3d]" />
                <span className="truncate max-w-[140px] font-mono text-[11px]">{att.name}</span>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(idx)}
                    className="p-0.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2 px-1">
          {/* Left: Plus [+] Button matching ChatGPT */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-white hover:bg-[#2f2f2f] active:scale-95 transition-all flex-shrink-0 touch-manipulation"
            title="Attach files"
            aria-label="Attach files"
          >
            <Plus size={19} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Center: Textarea input matching ChatGPT */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder={isListening ? 'Listening…' : placeholder}
            disabled={isThinking}
            className="flex-1 bg-transparent text-[15px] sm:text-[15.5px] text-[#ececec] placeholder-[#8e8e8e] resize-none outline-none leading-relaxed scrollbar-thin disabled:opacity-50 min-h-[38px] max-h-[160px] py-1.5 px-1 font-sans"
          />

          {/* Right: Think Pill, Mic Icon, and Golden Audio/Send Circle matching ChatGPT */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Think Pill Button (ChatGPT Think button) */}
            <button
              type="button"
              onClick={() => setThinkMode(m => !m)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                thinkMode
                  ? 'bg-[#333333] text-[#d49a3d] border border-[#d49a3d]/40'
                  : 'bg-[#2a2a2a] hover:bg-[#333333] text-neutral-300'
              }`}
              title="Toggle deep reasoning"
            >
              <Brain size={14} className={thinkMode ? 'text-[#d49a3d]' : 'text-neutral-400'} />
              <span>Think</span>
            </button>

            {/* Microphone button */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={!isSupported || isThinking}
              className={`p-2 rounded-full transition-all touch-manipulation active:scale-95 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : isSupported
                  ? 'text-[#8e8e8e] hover:text-white hover:bg-[#2f2f2f]'
                  : 'text-[#444444] cursor-not-allowed opacity-40'
              }`}
              title={
                !isSupported
                  ? 'Speech recognition not supported in this browser'
                  : isListening
                  ? 'Listening… Click to stop'
                  : 'Voice input'
              }
              aria-label="Voice input"
            >
              {isListening ? (
                <MicOff size={18} className="text-red-400 animate-pulse" />
              ) : (
                <Mic size={18} />
              )}
            </button>

            {/* Golden / Amber Voice Mode or Send Circle matching screenshot */}
            <button
              type="button"
              onClick={canSend ? onSend : handleMicClick}
              disabled={isThinking}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 shadow-md touch-manipulation active:scale-90 ${
                canSend
                  ? 'bg-[#d49a3d] hover:bg-[#e2a849] text-black cursor-pointer'
                  : 'bg-[#d49a3d] hover:bg-[#e2a849] text-black'
              }`}
              title={canSend ? 'Send message' : 'Voice mode'}
              aria-label={canSend ? 'Send message' : 'Voice mode'}
            >
              {canSend ? (
                <ArrowUp size={18} className="text-black font-bold stroke-[2.5]" />
              ) : (
                /* Waveform audio bars matching ChatGPT voice mode */
                <div className="flex items-center gap-[2.5px] h-3.5">
                  <span className="w-[2.5px] h-2 bg-black rounded-full" />
                  <span className="w-[2.5px] h-3.5 bg-black rounded-full" />
                  <span className="w-[2.5px] h-2.5 bg-black rounded-full" />
                  <span className="w-[2.5px] h-1.5 bg-black rounded-full" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
