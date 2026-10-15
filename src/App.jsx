import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Menu, SquarePen, History, Settings, Plus, Trash2, MessageSquare, ChevronDown, ChevronRight, X
} from 'lucide-react'

import { UserMessage, AIMessage, TypingIndicator } from './ChatMessages.jsx'
import InputDock from './InputDock.jsx'
import {
  generateId,
  loadSavedSessions,
  saveSessionsToStorage,
  generateConversationTitle,
  formatRelativeTime
} from './utils.js'
import { generateAIResponseAsync } from './aiEngine.js'

// ── Settings Modal ───────────────────────────────────────────
function SettingsModal({ onClose, onClearAllHistory, sessionCount }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-[#ececec]">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-2">
            <Settings size={17} className="text-[#d49a3d]" />
            <h3 className="text-sm font-semibold tracking-wide">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#262626] transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          <div>
            <span className="text-neutral-400 block mb-1.5 font-medium">Intelligence Engine</span>
            <div className="p-3 rounded-xl bg-[#212121] border border-[#2e2e2e] flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-200">peter AI Neural Core</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">High-speed reasoning & multi-turn dialog</p>
              </div>
              <span className="text-[11px] text-[#34d399] font-mono flex items-center gap-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block animate-pulse" /> Active
              </span>
            </div>
          </div>

          <div>
            <span className="text-neutral-400 block mb-1.5 font-medium">Voice Recognition</span>
            <div className="p-3 rounded-xl bg-[#212121] border border-[#2e2e2e] flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-200">Web Speech Engine</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Real-time voice transcription</p>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">Ready</span>
            </div>
          </div>

          <div>
            <span className="text-neutral-400 block mb-1.5 font-medium">Conversation Storage</span>
            <div className="p-3 rounded-xl bg-[#212121] border border-[#2e2e2e] flex items-center justify-between">
              <span className="text-neutral-300 font-mono">{sessionCount} conversation(s) stored</span>
              {sessionCount > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all conversation history?')) {
                      onClearAllHistory()
                      onClose()
                    }
                  }}
                  className="text-[11px] text-red-400 hover:underline hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2e2e2e] flex flex-col items-center justify-center text-center">
            <p className="text-[12px] text-neutral-300 font-medium">peter chatbot</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Built by Peter George Peter</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main App Component (Full Black ChatGPT Design) ───────────
export default function App() {
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const [showSettings, setShowSettings]     = useState(false)

  // Persistent Sessions from localStorage
  const [sessions, setSessions] = useState(() => loadSavedSessions())
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = loadSavedSessions()
    return saved.length > 0 ? saved[0].id : generateId()
  })
  const [messages, setMessages] = useState(() => {
    const saved = loadSavedSessions()
    return saved.length > 0 ? (saved[0].messages || []) : []
  })

  const [input, setInput]                   = useState('')
  const [attachments, setAttachments]       = useState([])
  const [isThinking, setThinking]           = useState(false)
  const [thinkingStatus, setThinkingStatus] = useState(null)

  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, thinkingStatus])

  const now = () => {
    const d = new Date()
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  // ── Execute AI Prompt ──────────────────────────────────────
  const executePrompt = useCallback(async (promptText) => {
    const text = promptText.trim()
    if ((!text && attachments.length === 0) || isThinking) return

    let fullPrompt = text
    if (attachments.length > 0) {
      const filesDesc = attachments.map(f => `[Attached file: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`).join('\n')
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n${filesDesc}` : filesDesc
    }

    const userMsg = {
      id:        generateId(),
      role:      'user',
      content:   fullPrompt,
      text:      fullPrompt,
      time:      now(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachments([])
    setThinking(true)
    setThinkingStatus('Thinking…')

    // 1. Save user message to current session & localStorage
    setSessions(prevSessions => {
      const existingIdx = prevSessions.findIndex(s => s.id === currentSessionId)
      let updated
      if (existingIdx >= 0) {
        const target = prevSessions[existingIdx]
        const updatedTarget = {
          ...target,
          timestamp: Date.now(),
          messages:  [...(target.messages || []), userMsg],
        }
        updated = [updatedTarget, ...prevSessions.filter((_, i) => i !== existingIdx)]
      } else {
        const newSession = {
          id:        currentSessionId,
          title:     generateConversationTitle(text || 'File attachment'),
          timestamp: Date.now(),
          messages:  [userMsg],
        }
        updated = [newSession, ...prevSessions]
      }
      saveSessionsToStorage(updated)
      return updated
    })

    try {
      // 2. Call dynamic AI engine with multi-turn context
      const response = await generateAIResponseAsync(fullPrompt, 'general', (status) => {
        setThinkingStatus(status)
      }, messages)

      const aiMsg = {
        id:        generateId(),
        role:      'assistant',
        content:   response.text || '',
        text:      response.text || '',
        time:      now(),
        timestamp: Date.now(),
        ...response,
      }

      setMessages(prev => [...prev, aiMsg])
      setThinking(false)
      setThinkingStatus(null)

      // 3. Save AI response to session & localStorage
      setSessions(prevSessions => {
        const existingIdx = prevSessions.findIndex(s => s.id === currentSessionId)
        let updated
        if (existingIdx >= 0) {
          const target = prevSessions[existingIdx]
          const updatedTarget = {
            ...target,
            timestamp: Date.now(),
            messages:  [...(target.messages || []), aiMsg],
          }
          updated = [updatedTarget, ...prevSessions.filter((_, i) => i !== existingIdx)]
        } else {
          const newSession = {
            id:        currentSessionId,
            title:     generateConversationTitle(text),
            timestamp: Date.now(),
            messages:  [userMsg, aiMsg],
          }
          updated = [newSession, ...prevSessions]
        }
        saveSessionsToStorage(updated)
        return updated
      })

    } catch (err) {
      console.error('AI execution error:', err)
      setThinking(false)
      setThinkingStatus(null)
      const errorMsg = err?.message || 'Unable to reach backend server. Please check your connection and try again.'
      const fallbackMsg = {
        id:          generateId(),
        role:        'assistant',
        content:     `⚠️ ${errorMsg}`,
        text:        `⚠️ ${errorMsg}`,
        time:        now(),
        timestamp:   Date.now(),
      }
      setMessages(prev => [...prev, fallbackMsg])
    }
  }, [isThinking, currentSessionId, messages, attachments])

  const handleSend = useCallback(() => executePrompt(input), [executePrompt, input])

  // Regenerate last response
  const handleRegenerate = useCallback(() => {
    if (messages.length === 0 || isThinking) return
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      executePrompt(lastUserMsg.content || lastUserMsg.text)
    }
  }, [messages, isThinking, executePrompt])

  // ── Session Management ─────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    const newId = generateId()
    setCurrentSessionId(newId)
    setMessages([])
    setInput('')
    setAttachments([])
    setThinkingStatus(null)
    setDrawerOpen(false)
  }, [])

  const handleSelectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId)
    const target = sessions.find(s => s.id === sessionId)
    if (target) setMessages(target.messages || [])
    setInput('')
    setAttachments([])
    setThinkingStatus(null)
    setDrawerOpen(false)
  }, [sessions])

  const handleDeleteSession = useCallback((sessionId) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId)
      saveSessionsToStorage(remaining)
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id)
          setMessages(remaining[0].messages || [])
        } else {
          setCurrentSessionId(generateId())
          setMessages([])
        }
      }
      return remaining
    })
  }, [currentSessionId])

  const handleClearAllHistory = useCallback(() => {
    setSessions([])
    saveSessionsToStorage([])
    setCurrentSessionId(generateId())
    setMessages([])
  }, [])

  const handleAddAttachments = (newFiles) => {
    setAttachments(prev => [...prev, ...newFiles])
  }

  const handleRemoveAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const hasMessages = messages.length > 0 || isThinking

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#000000] text-[#ececec] flex flex-col relative overflow-hidden select-none font-sans">

      {/* ── Top Header Bar (Full Black ChatGPT Style) ── */}
      <header className="w-full flex items-center justify-between px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 bg-[#000000] z-20 flex-shrink-0 select-none">
        {/* Left: Sidebar Menu Toggle + App Title */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-[#8e8e8e] hover:text-white hover:bg-[#1a1a1a] active:scale-95 transition-all touch-manipulation"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
          >
            <span className="text-[15px] sm:text-base font-semibold tracking-tight text-[#ececec]">
              peter chatbot
            </span>
          </button>
        </div>

        {/* Right: New Chat Icon Button (ChatGPT SquarePen Style, NO X mark) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNewConversation}
            className="p-2 rounded-lg text-[#8e8e8e] hover:text-white hover:bg-[#1a1a1a] active:scale-95 transition-all touch-manipulation"
            title="New chat"
            aria-label="New chat"
          >
            <SquarePen size={19} />
          </button>
        </div>
      </header>

      {/* ── Main Chat Canvas (Full Solid Black) ── */}
      <main className="flex-1 flex flex-col min-h-0 w-full relative overflow-hidden bg-[#000000]">
        {!hasMessages ? (
          /* Empty State: Centered Greeting like ChatGPT */
          <div className="flex-1 flex flex-col items-center justify-center relative select-none px-4 my-auto">
            <h1 className="text-2xl sm:text-3xl font-medium text-[#ececec] text-center tracking-normal px-4 max-w-xl leading-snug">
              What can peter help you with today?
            </h1>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-4 select-text">
            <div className="w-full max-w-3xl mx-auto space-y-4">
              {messages.map(msg =>
                msg.role === 'user'
                  ? <UserMessage key={msg.id} message={msg} />
                  : <AIMessage   key={msg.id} message={msg} onRegenerate={handleRegenerate} />
              )}
              {isThinking && <TypingIndicator status={thinkingStatus} />}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* ── Bottom Input Dock & Disclaimer (ChatGPT Style) ── */}
        <div className="w-full bg-[#000000] px-3 sm:px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 flex-shrink-0 z-20">
          <div className="w-full max-w-3xl mx-auto flex flex-col">
            <InputDock
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isThinking={isThinking}
              attachments={attachments}
              onAddAttachments={handleAddAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              placeholder="Ask peter..."
            />

            {/* Disclaimer directly below input pill matching ChatGPT screenshot */}
            <div className="pt-2 pb-0.5 text-center text-[11px] sm:text-xs text-[#8e8e8e] select-none">
              peter chatbot can make mistakes. Built by <span className="text-neutral-400 font-normal">Peter George Peter</span>.
            </div>
          </div>
        </div>
      </main>

      {/* ── Slide-Over Sidebar Drawer (ChatGPT Style) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            aria-label="Close menu drawer"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[82vw] h-full bg-[#171717] border-r border-[#262626] p-3 sm:p-4 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <span className="text-sm font-semibold tracking-tight text-[#ececec]">
                peter chatbot
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#262626] transition-colors"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Action: New Chat Button */}
            <div className="pt-3 pb-2">
              <button
                onClick={handleNewConversation}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] active:scale-98 border border-[#2e2e2e] text-xs font-medium text-[#ececec] transition-all shadow-sm"
              >
                <Plus size={15} className="text-[#d49a3d]" />
                <span>New chat</span>
              </button>
            </div>

            {/* Navigation Options: History & Settings */}
            <div className="flex-1 overflow-hidden flex flex-col py-1">
              {/* History Section Toggle */}
              <button
                onClick={() => setHistoryExpanded(e => !e)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[#212121] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History size={14} className="text-[#8e8e8e]" />
                  <span>Chats</span>
                </div>
                <div className="flex items-center gap-1 text-[#8e8e8e]">
                  {sessions.length > 0 && (
                    <span className="text-[10px] font-mono">
                      {sessions.length}
                    </span>
                  )}
                  {historyExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
              </button>

              {/* Sessions List */}
              {historyExpanded && (
                <div className="flex-1 overflow-y-auto space-y-0.5 px-1 py-1 scrollbar-thin">
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 text-neutral-500 text-xs">
                      No previous chats yet
                    </div>
                  ) : (
                    sessions.map((session) => {
                      const isActive = currentSessionId === session.id
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session.id)}
                          className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all select-none ${
                            isActive
                              ? 'bg-[#212121] text-[#ececec] font-medium'
                              : 'text-neutral-400 hover:text-[#ececec] hover:bg-[#1f1f1f]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare
                              size={13}
                              className={`flex-shrink-0 ${isActive ? 'text-[#d49a3d]' : 'text-neutral-500'}`}
                            />
                            <span className="truncate">{session.title || 'Conversation'}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-neutral-500 font-mono group-hover:hidden">
                              {formatRelativeTime(session.timestamp)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSession(session.id)
                              }}
                              className="hidden group-hover:flex p-1 rounded hover:bg-[#2d1b1b] text-neutral-400 hover:text-red-400 transition-colors"
                              title="Delete conversation"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Settings button */}
              <button
                onClick={() => {
                  setDrawerOpen(false)
                  setShowSettings(true)
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[#212121] transition-colors mt-1"
              >
                <Settings size={14} className="text-[#8e8e8e]" />
                <span>Settings</span>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="mt-auto pt-3 border-t border-[#262626] flex flex-col gap-1.5">
              {sessions.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all conversation history?')) {
                      handleClearAllHistory()
                    }
                  }}
                  className="w-full text-center text-xs text-neutral-500 hover:text-red-400 py-1 transition-colors"
                >
                  Clear all chats
                </button>
              )}
              <div className="text-center text-[10.5px] text-neutral-500 select-none">
                Built by <span className="text-neutral-400">Peter George Peter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onClearAllHistory={handleClearAllHistory}
          sessionCount={sessions.length}
        />
      )}
    </div>
  )
}
