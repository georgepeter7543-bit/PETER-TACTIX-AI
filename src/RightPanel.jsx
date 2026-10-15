import { useState, useRef, useEffect } from 'react'
import {
  ListTodo, GitCompare, Terminal, Plus, Maximize2, Minimize2, PanelRightClose,
  ChevronDown, ChevronRight, Users, FileCode2, FileImage, Upload,
  Clock, TerminalSquare, CheckCircle2, CornerDownLeft
} from 'lucide-react'

// ── Badge ────────────────────────────────────────────────────
function Badge({ count, color = 'bg-[#2a2d35] text-[#8b95a5]' }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-medium ${color}`}>
      {count}
    </span>
  )
}

// ── Accordion row ────────────────────────────────────────────
function AccordionRow({ icon: Icon, label, badge, badgeColor, status, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="accordion-item">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left hover:bg-[#1a1d24] transition-colors"
      >
        <Icon size={14} className="text-[#8b95a5] flex-shrink-0" />
        <span className="flex-1 text-xs text-[#c9d1d9] font-medium">{label}</span>
        {status && (
          <span className="text-[10px] text-[#4a5568] mr-1">{status}</span>
        )}
        {badge !== undefined && <Badge count={badge} color={badgeColor} />}
        <div className="text-[#4a5568]">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </div>
      </button>
      {open && children && (
        <div className="bg-[#0d0e11] border-t border-[#2a2d35] px-4 py-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Terminals tab ────────────────────────────────────────────
function TerminalsTab({ isMaximized, stats }) {
  const [history, setHistory] = useState([
    { type: 'system', text: '$ PETER TACTIX AI Shell v1.0 — Ready' },
    { type: 'system', text: 'Type "help" for a list of available commands.' },
  ])
  const [inputVal, setInputVal] = useState('')
  const terminalEndRef = useRef(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleCommand = (e) => {
    if (e.key === 'Enter') {
      const cmd = inputVal.trim()
      if (!cmd) return

      const newHistory = [...history, { type: 'user', text: `$ ${cmd}` }]
      const lower = cmd.toLowerCase()

      if (lower === 'clear') {
        setHistory([])
        setInputVal('')
        return
      } else if (lower === 'help') {
        newHistory.push({
          type: 'output',
          text: 'Available commands:\n  help      - Show this help message\n  status    - View agent workload and inspection state\n  build     - Run project compilation verification\n  clear     - Clear terminal buffer\n  model     - Display active AI model configuration\n  whoami    - Display developer & author credit',
        })
      } else if (lower === 'status') {
        newHistory.push({
          type: 'output',
          text: `AGENT STATUS:\n  Subagents: ${stats?.subagents || 0}\n  Files Changed: ${stats?.filesChanged || 0} (Uncommitted)\n  Artifacts: ${stats?.artifacts || 0}\n  Background Tasks: ${stats?.bgTasks || 0}\n  Active Terminals: ${stats?.terminals || 1}`,
        })
      } else if (lower === 'build') {
        newHistory.push({
          type: 'output',
          text: 'vite v6.4.4 building for production...\n✓ 1582 modules transformed.\nrendering chunks...\n✓ built in 1.84s — dist/assets/index.js (ready)',
        })
      } else if (lower === 'model') {
        newHistory.push({
          type: 'output',
          text: 'Active Model: Claude Sonnet 4.6 (Thinking enabled)\nWorkspace Engine: PETER TACTIX Agentic Engine v1.0',
        })
      } else if (lower === 'whoami') {
        newHistory.push({
          type: 'output',
          text: 'PETER TACTIX AI • Lead Engineer: Peter George Peter',
        })
      } else {
        newHistory.push({
          type: 'output',
          text: `Command executed: "${cmd}". Type "help" for list of commands.`,
        })
      }

      setHistory(newHistory)
      setInputVal('')
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0b0e]">
      {/* Terminal output */}
      <div className="flex-1 font-mono text-xs text-[#34d399] p-4 overflow-y-auto leading-relaxed scrollbar-thin space-y-1">
        {history.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap ${
              line.type === 'user'
                ? 'text-[#e2e8f0] font-semibold'
                : line.type === 'system'
                ? 'text-[#8b95a5]'
                : 'text-[#34d399]'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal prompt bar */}
      <div className="border-t border-[#2a2d35] bg-[#0f1117] px-3 py-2.5 flex items-center gap-2">
        <span className="text-[#34d399] text-xs font-mono font-bold select-none">$</span>
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent text-xs text-[#e2e8f0] font-mono outline-none placeholder-[#4a5568]"
          placeholder="Type terminal command (try 'help', 'status', 'build')..."
        />
        <button
          onClick={() => handleCommand({ key: 'Enter' })}
          className="p-1 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
          title="Run command"
        >
          <CornerDownLeft size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Code Diffs tab ───────────────────────────────────────────
function DiffsTab({ filesChanged }) {
  if (filesChanged === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center p-6">
        <GitCompare size={24} className="text-[#4a5568] mb-2" />
        <p className="text-xs text-[#8b95a5] font-medium">No uncommitted changes</p>
        <p className="text-[11px] text-[#4a5568] mt-1">Working tree clean. Changes will appear here when generated.</p>
      </div>
    )
  }
  return (
    <div className="p-4 space-y-3">
      <div className="bg-[#0a0b0e] border border-[#2a2d35] rounded-lg font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2d35] bg-[#0f1117]">
          <div className="flex items-center gap-2">
            <span className="text-[#e2e8f0] font-semibold">src/App.jsx</span>
            <span className="text-[10px] text-[#8b95a5] bg-[#1e2028] px-1.5 py-0.5 rounded">MODIFIED</span>
          </div>
          <span className="text-[#34d399] font-medium">+{filesChanged * 4} -{filesChanged}</span>
        </div>
        <div className="p-3 leading-relaxed space-y-1">
          <p className="text-[#8b95a5] text-[11px]">@@ -1,8 +1,11 @@</p>
          <p className="text-[#f87171]">- const [isOpen, setIsOpen] = useState(false)</p>
          <p className="text-[#34d399]">+ const [isRightPanelHidden, setIsRightPanelHidden] = useState(false)</p>
          <p className="text-[#34d399]">+ const [isMaximized, setIsMaximized] = useState(false)</p>
          <p className="text-[#8b95a5]">  import RightPanel from './RightPanel.jsx'</p>
        </div>
      </div>
    </div>
  )
}

// ── Main right panel ─────────────────────────────────────────
export default function RightPanel({
  isHidden,
  onToggle,
  isMaximized,
  onToggleMaximize,
  stats,
  isMobile = false,
}) {
  const [activeTab, setActiveTab] = useState('tasks')

  const tabs = [
    { id: 'tasks',    icon: ListTodo,   label: 'Tasks & State' },
    { id: 'diffs',    icon: GitCompare, label: 'Code Diffs'    },
    { id: 'terminal', icon: Terminal,   label: 'Terminals'     },
  ]

  const {
    subagents = 0,
    filesChanged = 0,
    artifacts = 0,
    uploads = 0,
    bgTasks = 0,
    terminals = 1,
  } = stats || {}

  // Escape key to restore when maximized
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        onToggleMaximize()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMaximized, onToggleMaximize])

  // Content JSX rendered in both standard and maximized modes
  const panelContent = (
    <div className="flex flex-col h-full w-full">
      {/* Panel header */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[#2a2d35] bg-[#111318] flex-shrink-0">
        {/* Tab toggles */}
        <div className="flex items-center gap-1 flex-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              className={`panel-tab ${activeTab === id ? 'active' : ''}`}
            >
              <Icon size={13} />
              <span className={isMaximized ? 'inline' : 'hidden xl:inline'}>{label}</span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isMaximized && (
            <span className="text-[10px] text-[#4f8ef7] font-mono font-medium px-2 py-0.5 rounded bg-[#4f8ef7]/10 border border-[#4f8ef7]/30 mr-1 select-none">
              MAXIMIZED (ESC to restore)
            </span>
          )}

          <button
            className="p-1.5 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
            title="New Item"
          >
            <Plus size={13} />
          </button>

          {/* Maximize / Minimize toggle button */}
          <button
            onClick={onToggleMaximize}
            className={`p-1.5 rounded transition-colors ${
              isMaximized
                ? 'bg-[#1e2028] text-[#4f8ef7] hover:bg-[#2a2d35]'
                : 'text-[#8b95a5] hover:text-[#e2e8f0] hover:bg-[#1e2028]'
            }`}
            title={isMaximized ? "Restore / Minimize Panel (ESC)" : "Maximize Panel to Fullscreen"}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Hide panel button */}
          <button
            onClick={() => {
              if (isMaximized) onToggleMaximize()
              onToggle()
            }}
            className="p-1.5 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
            title="Hide Panel"
          >
            <PanelRightClose size={13} />
          </button>
        </div>
      </div>

      {/* Tab contents */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'tasks' && (
          <div className="divide-y divide-[#2a2d35]">
            <AccordionRow
              icon={Users}
              label="Subagents"
              badge={subagents}
              badgeColor={subagents > 0 ? 'bg-[#4f8ef7]/20 text-[#4f8ef7]' : undefined}
            >
              <p className="text-xs text-[#4a5568]">No active subagents.</p>
            </AccordionRow>

            <AccordionRow
              icon={FileCode2}
              label="Files Changed"
              badge={filesChanged}
              badgeColor={filesChanged > 0 ? 'bg-[#fbbf24]/20 text-[#fbbf24]' : undefined}
              status={filesChanged > 0 ? 'Uncommitted' : undefined}
              defaultOpen={filesChanged > 0}
            >
              {filesChanged === 0 ? (
                <p className="text-xs text-[#4a5568]">No file changes yet.</p>
              ) : (
                <div className="space-y-1">
                  {Array.from({ length: filesChanged }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 size={11} className="text-[#34d399]" />
                      <span className="text-[#c9d1d9] font-mono">file_{i + 1}.js</span>
                      <span className="ml-auto text-[#34d399] font-mono">+1</span>
                    </div>
                  ))}
                </div>
              )}
            </AccordionRow>

            <AccordionRow
              icon={FileImage}
              label="Artifacts"
              badge={artifacts}
              badgeColor={artifacts > 0 ? 'bg-[#34d399]/20 text-[#34d399]' : undefined}
            >
              <p className="text-xs text-[#4a5568]">No artifacts generated.</p>
            </AccordionRow>

            <AccordionRow
              icon={Upload}
              label="Uploads"
              badge={uploads}
            >
              <p className="text-xs text-[#4a5568]">No files uploaded.</p>
            </AccordionRow>

            <AccordionRow
              icon={Clock}
              label="Background Tasks"
              badge={bgTasks}
              badgeColor={bgTasks > 0 ? 'bg-[#c792ea]/20 text-[#c792ea]' : undefined}
            >
              <p className="text-xs text-[#4a5568]">No background tasks running.</p>
            </AccordionRow>

            <AccordionRow
              icon={TerminalSquare}
              label="Terminals"
              badge={terminals}
              badgeColor="bg-[#34d399]/20 text-[#34d399]"
              defaultOpen={true}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                  <span className="text-[#c9d1d9] font-mono">bash — PETER TACTIX AI</span>
                </div>
                <button
                  onClick={() => setActiveTab('terminal')}
                  className="text-[11px] text-[#4f8ef7] hover:underline"
                >
                  Open Shell
                </button>
              </div>
            </AccordionRow>
          </div>
        )}

        {activeTab === 'diffs' && (
          <DiffsTab filesChanged={filesChanged} />
        )}

        {activeTab === 'terminal' && (
          <div className="h-full">
            <TerminalsTab isMaximized={isMaximized} stats={stats} />
          </div>
        )}
      </div>
    </div>
  )

  // ── Maximized full screen state ────────────────────────────
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#111318] overflow-hidden animate-in fade-in duration-200">
        {panelContent}
      </div>
    )
  }

  // ── Standard side-panel state ──────────────────────────────
  return (
    <aside
      style={
        isMobile
          ? {
              transform: isHidden ? 'translateX(100%)' : 'translateX(0)',
              transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
              width: 'min(340px, 90vw)',
            }
          : {
              width: isHidden ? 0 : 320,
              minWidth: isHidden ? 0 : 320,
              borderLeftWidth: isHidden ? 0 : 1,
              transition:
                'width 280ms cubic-bezier(0.4, 0, 0.2, 1), min-width 280ms cubic-bezier(0.4, 0, 0.2, 1), border-left-width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
            }
      }
      className={`
        flex-shrink-0 flex flex-col bg-[#111318] border-[#2a2d35] overflow-hidden
        ${isMobile ? 'fixed inset-y-0 right-0 z-50 shadow-2xl border-l' : ''}
      `}
    >
      {/* Inner wrapper keeps content width during collapse transition */}
      <div className="flex flex-col h-full w-full" style={isMobile ? undefined : { width: 320, minWidth: 320 }}>
        {panelContent}
      </div>
    </aside>
  )
}
