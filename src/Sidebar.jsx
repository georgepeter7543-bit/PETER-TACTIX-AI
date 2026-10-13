import { useState } from 'react'
import {
  MessageSquarePlus, History, Zap,
  FolderOpen, FolderPlus, ChevronDown, ChevronRight,
  Cpu, Plus, PanelLeftClose, MessageSquare, Trash2
} from 'lucide-react'
import { formatRelativeTime } from './utils.js'

export default function Sidebar({
  projects,
  onNewProject,
  onSelectProject,
  activeProjectId,
  onNavSelect,
  activeNav,
  isHidden,
  onToggle,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewConversation,
  onDeleteSession,
  onClearAllHistory
}) {
  const [historyOpen, setHistoryOpen] = useState(true)
  const [projectsOpen, setProjectsOpen] = useState(true)

  const navItems = [
    { id: 'automations', icon: Zap, label: 'Automations' },
  ]

  return (
    <aside
      style={{
        width: isHidden ? 0 : 256,
        minWidth: isHidden ? 0 : 256,
        borderRightWidth: isHidden ? 0 : 1,
        transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), min-width 280ms cubic-bezier(0.4, 0, 0.2, 1), border-right-width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="flex-shrink-0 flex flex-col bg-[#111318] border-[#2a2d35] overflow-hidden select-none"
    >
      {/* Inner wrapper stays fixed at 256px so content does not squish during collapse */}
      <div className="flex flex-col h-full" style={{ width: 256, minWidth: 256 }}>
        {/* Brand & collapse button */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#2a2d35]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4f8ef7] to-[#34d399] flex items-center justify-center flex-shrink-0">
              <Cpu size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-[#e2e8f0] tracking-wide truncate">PETER TACTIX AI</span>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors flex-shrink-0"
              title="Hide Left Sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Primary Action: New Conversation */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a1d24] hover:bg-[#20242d] border border-[#2a2d35] hover:border-[#3a3f4a] text-xs font-medium text-[#e2e8f0] transition-colors group shadow-sm"
          >
            <MessageSquarePlus size={15} className="text-[#4f8ef7] flex-shrink-0" />
            <span className="flex-1 text-left">New Conversation</span>
          </button>
        </div>

        {/* Scrollable Center: History & Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {/* Conversation History Section */}
          <div className="mb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8b95a5] uppercase tracking-wider hover:text-[#e2e8f0] transition-colors"
              >
                {historyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <History size={13} className="text-[#8b95a5]" />
                <span>History</span>
                {sessions.length > 0 && (
                  <span className="text-[10px] bg-[#1e2028] text-[#8b95a5] px-1.5 py-0.2 rounded-full font-mono">
                    {sessions.length}
                  </span>
                )}
              </button>

              {sessions.length > 0 && historyOpen && onClearAllHistory && (
                <button
                  onClick={onClearAllHistory}
                  title="Clear all conversation history"
                  className="text-[10px] text-[#4a5568] hover:text-[#f87171] transition-colors px-1 py-0.5 rounded hover:bg-[#1e2028]"
                >
                  Clear all
                </button>
              )}
            </div>

            {historyOpen && (
              <div className="mt-1 space-y-0.5">
                {sessions.length === 0 ? (
                  <div className="px-3 py-2 text-center">
                    <p className="text-[11px] text-[#4a5568]">No previous chats</p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = activeSessionId === session.id
                    return (
                      <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`
                          group flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs cursor-pointer transition-all select-none
                          ${isActive
                            ? 'bg-[#1e2028] text-[#e2e8f0] font-medium border-l-2 border-[#4f8ef7]'
                            : 'text-[#8b95a5] hover:text-[#e2e8f0] hover:bg-[#1a1c22]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare
                            size={13}
                            className={`flex-shrink-0 ${isActive ? 'text-[#4f8ef7]' : 'text-[#4a5568]'}`}
                          />
                          <span className="truncate text-xs">{session.title || 'Conversation'}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-[#4a5568] group-hover:hidden font-mono">
                            {formatRelativeTime(session.timestamp)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteSession(session.id)
                            }}
                            title="Delete conversation"
                            className="hidden group-hover:flex p-1 rounded hover:bg-[#2a2d35] text-[#8b95a5] hover:text-[#f87171] transition-colors"
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
          </div>

          <div className="mx-2 border-t border-[#2a2d35] my-2" />

          {/* Other Nav Links */}
          <nav className="space-y-0.5 mb-2">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => onNavSelect(id)}
                className={`sidebar-link w-full text-left ${activeNav === id ? 'active' : ''}`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mx-2 border-t border-[#2a2d35] my-2" />

          {/* Projects Section (preserved empty state) */}
          <div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                onClick={() => setProjectsOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8b95a5] uppercase tracking-wider hover:text-[#e2e8f0] transition-colors"
              >
                {projectsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Projects
              </button>
              <button
                onClick={onNewProject}
                title="New Project"
                className="p-1 rounded hover:bg-[#1e2028] text-[#8b95a5] hover:text-[#e2e8f0] transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            {projectsOpen && (
              <div className="mt-1">
                {projects.length === 0 ? (
                  <div className="mx-1 mt-1 mb-2 rounded-lg border border-dashed border-[#2a2d35] p-4 text-center">
                    <FolderOpen size={20} className="mx-auto mb-2 text-[#4a5568]" />
                    <p className="text-xs text-[#4a5568] leading-relaxed">No Projects Yet</p>
                    <button
                      onClick={onNewProject}
                      className="mt-2 flex items-center gap-1 mx-auto text-xs text-[#4f8ef7] hover:text-[#7aabff] transition-colors"
                    >
                      <FolderPlus size={12} />
                      New Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {projects.map(p => (
                      <ProjectItem
                        key={p.id}
                        project={p}
                        isActive={activeProjectId === p.id}
                        onClick={() => onSelectProject(p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Ownership footer ── */}
        <div className="flex-shrink-0">
          <div className="mx-3 border-t border-[#1e2025]" />
          <div className="group px-4 py-3 select-none">
            <p className="text-[11px] leading-snug text-[#6b7280]">
              PETER TACTIX AI v1.0
            </p>
            <p className="text-[11px] leading-snug text-[#6b7280] mt-0.5">
              Built by{' '}
              <span className="text-[#94a3b8] group-hover:text-[#22d3ee] transition-colors duration-200 cursor-default">
                Peter George Peter
              </span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ProjectItem({ project, isActive, onClick }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => { onClick(); setOpen(o => !o) }}
        className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
      >
        <span className="flex items-center gap-1.5 flex-1 min-w-0">
          {open ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />}
          <FolderOpen size={13} className="flex-shrink-0" />
          <span className="truncate text-xs">{project.name}</span>
        </span>
      </button>
      {open && project.conversations && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {project.conversations.map(c => (
            <div key={c.id} className="sidebar-link text-xs truncate pl-3">
              {c.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
