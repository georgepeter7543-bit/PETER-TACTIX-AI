import { useState, useRef, useEffect, useCallback } from 'react'
import {
  PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose,
  ChevronRight, X
} from 'lucide-react'

import Sidebar from './Sidebar.jsx'
import { UserMessage, AIMessage, TypingIndicator, EmptyState } from './ChatMessages.jsx'
import InputDock from './InputDock.jsx'
import RightPanel from './RightPanel.jsx'
import {
  generateId,
  loadSavedSessions,
  saveSessionsToStorage,
  generateConversationTitle
} from './utils.js'
import { generateAIResponseAsync } from './aiEngine.js'

// ── New Project Modal ────────────────────────────────────────
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])
  const submit = () => {
    if (name.trim()) { onCreate(name.trim()); onClose() }
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#16181d] border border-[#2a2d35] rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">New Project</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2a2d35] text-[#8b95a5]"><X size={14} /></button>
        </div>
        <input
          ref={ref}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Project name..."
          className="w-full bg-[#111318] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#4f8ef7] transition-colors mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#8b95a5] hover:text-[#e2e8f0] transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs bg-[#4f8ef7] hover:bg-[#5a96f8] text-white rounded-lg transition-colors disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Breadcrumb ───────────────────────────────────────────────
function Breadcrumb({ parts }) {
  return (
    <div className="flex items-center gap-1 text-xs text-[#8b95a5]">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-[#4a5568]" />}
          <span className={i === parts.length - 1 ? 'text-[#e2e8f0] font-medium' : 'hover:text-[#e2e8f0] cursor-pointer transition-colors'}>
            {p}
          </span>
        </span>
      ))}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [projects, setProjects]                 = useState([])
  const [activeProjectId, setActiveProject]     = useState(null)
  const [activeNav, setActiveNav]               = useState('new-conversation')
  const [showNewProject, setShowNewProject]     = useState(false)
  const [leftSidebarHidden, setLeftSidebarHidden] = useState(false)
  const [rightPanelHidden, setRightPanelHidden]   = useState(false)
  const [rightPanelMaximized, setRightPanelMaximized] = useState(false)


  // ── Persistent Sessions from localStorage ──────────────────
  const [sessions, setSessions] = useState(() => loadSavedSessions())
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = loadSavedSessions()
    return saved.length > 0 ? saved[0].id : generateId()
  })
  const [messages, setMessages] = useState(() => {
    const saved = loadSavedSessions()
    return saved.length > 0 ? (saved[0].messages || []) : []
  })

  const [input, setInput]                 = useState('')
  const [mode, setMode]                   = useState('general')
  const [isThinking, setThinking]         = useState(false)
  const [thinkingStatus, setThinkingStatus] = useState(null)

  // Stats for right panel
  const [stats, setStats] = useState({ subagents: 0, filesChanged: 0, artifacts: 0, uploads: 0, bgTasks: 0, terminals: 1 })

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

  // ── Core Dynamic Intent & Live Search Execution ────────────
  const executePrompt = useCallback(async (promptText) => {
    const text = promptText.trim()
    if (!text || isThinking) return

    const userMsg = {
      id:        generateId(),
      role:      'user',
      content:   text,
      text:      text,
      time:      now(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    setThinkingStatus('Thinking with Gemini…')

    // 1. Save user message immediately to session & localStorage
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
          title:     generateConversationTitle(text),
          timestamp: Date.now(),
          messages:  [userMsg],
        }
        updated = [newSession, ...prevSessions]
      }
      saveSessionsToStorage(updated)
      return updated
    })

    try {
      // 2. Call dynamic AI engine with conversation history for multi-turn context
      const response = await generateAIResponseAsync(text, mode, (status) => {
        setThinkingStatus(status)
      }, messages)  // ← pass full message history

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

      // 4. Update panel stats
      if (response.filesChanged > 0) setStats(prev => ({ ...prev, filesChanged: prev.filesChanged + response.filesChanged }))
      if (response.code)             setStats(prev => ({ ...prev, artifacts:    prev.artifacts    + 1 }))
      if (response.type === 'search') setStats(prev => ({ ...prev, bgTasks:     prev.bgTasks      + 1 }))

    } catch (err) {
      console.error('AI execution error:', err)
      setThinking(false)
      setThinkingStatus(null)
      const errorMsg = err?.message || 'Network error: Unable to reach PETER TACTIX AI backend server. Please check your internet connection or server logs and try again.'
      const fallbackMsg = {
        id:          generateId(),
        role:        'assistant',
        content:     errorMsg.startsWith('⚠️') ? errorMsg : `⚠️ ${errorMsg}`,
        text:        errorMsg.startsWith('⚠️') ? errorMsg : `⚠️ ${errorMsg}`,
        time:        now(),
        timestamp:   Date.now(),
        thought:     errorMsg,
        thoughtTime: '—',
        workTime:    '—',
      }
      setMessages(prev => [...prev, fallbackMsg])
    }
  }, [isThinking, mode, currentSessionId, messages])

  const handleSend = useCallback(() => executePrompt(input), [executePrompt, input])
  const handleQuickAction = useCallback((prompt) => executePrompt(prompt), [executePrompt])

  // ── Session Actions ────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    const newId = generateId()
    setCurrentSessionId(newId)
    setMessages([])
    setInput('')
    setThinkingStatus(null)
  }, [])

  const handleSelectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId)
    const target = sessions.find(s => s.id === sessionId)
    if (target) setMessages(target.messages || [])
    setInput('')
    setThinkingStatus(null)
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

  const handleNewProject = useCallback((name) => {
    const newProject = { id: generateId(), name, conversations: [] }
    setProjects(prev => [...prev, newProject])
    setActiveProject(newProject.id)
  }, [])

  // Breadcrumb
  const activeProject = projects.find(p => p.id === activeProjectId)
  const activeSession = sessions.find(s => s.id === currentSessionId)
  const sessionTitle  = activeSession ? activeSession.title : 'General'
  const breadcrumbParts = activeProject
    ? ['WORKSPACE', activeProject.name, sessionTitle]
    : ['WORKSPACE', sessionTitle]

  return (
    <div className="flex h-screen bg-[#0d0e11] overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        projects={projects}
        onNewProject={() => setShowNewProject(true)}
        onSelectProject={setActiveProject}
        activeProjectId={activeProjectId}
        onNavSelect={setActiveNav}
        activeNav={activeNav}
        isHidden={leftSidebarHidden}
        onToggle={() => setLeftSidebarHidden(h => !h)}
        sessions={sessions}
        activeSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewConversation={handleNewConversation}
        onDeleteSession={handleDeleteSession}
        onClearAllHistory={handleClearAllHistory}
      />

      {/* Center: Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2d35] bg-[#0d0e11] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftSidebarHidden(h => !h)}
              className="p-1.5 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
              title={leftSidebarHidden ? 'Show Left Sidebar' : 'Hide Left Sidebar'}
            >
              {leftSidebarHidden ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
            <Breadcrumb parts={breadcrumbParts} />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (rightPanelMaximized) setRightPanelMaximized(false)
                setRightPanelHidden(h => !h)
              }}
              className="p-1.5 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
              title={rightPanelHidden ? 'Show Agent Panel' : 'Hide Agent Panel'}
            >
              {rightPanelHidden ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </button>
          </div>
        </header>

        {/* Chat stream */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {messages.length === 0 && !isThinking ? (
            <EmptyState onQuickAction={handleQuickAction} />
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map(msg =>
                msg.role === 'user'
                  ? <UserMessage key={msg.id} message={msg} />
                  : <AIMessage   key={msg.id} message={msg} />
              )}
              {isThinking && <TypingIndicator status={thinkingStatus} />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input dock */}
        <div className="flex-shrink-0">
          <InputDock
            value={input}
            onChange={setInput}
            onSend={handleSend}
            mode={mode}
            onModeChange={setMode}
            isThinking={isThinking}
          />
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        isHidden={rightPanelHidden}
        onToggle={() => setRightPanelHidden(h => !h)}
        isMaximized={rightPanelMaximized}
        onToggleMaximize={() => setRightPanelMaximized(m => !m)}
        stats={stats}
      />

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleNewProject}
        />
      )}
    </div>
  )
}
