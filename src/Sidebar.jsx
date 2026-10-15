import { History, Settings, X, Trash2, Plus, MessageSquare } from 'lucide-react'
import { formatRelativeTime } from './utils.js'

export default function Sidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewConversation,
  onDeleteSession,
  onClearAllHistory,
  historyOpen,
  onCloseHistory,
  onOpenHistory,
  onOpenSettings,
}) {
  return (
    <>
      {/* Minimalist Left Navigation Column matching Reference Image */}
      <div className="flex flex-col py-5 px-5 sm:px-6 select-none flex-shrink-0">
        {/* Brand Header: Completely removed bot icon, only 'peter chatbot' title */}
        <div className="mb-8">
          <button
            onClick={onNewConversation}
            className="text-left group cursor-pointer focus:outline-none"
            title="peter chatbot (click to start new chat)"
          >
            <span className="text-[15px] sm:text-base font-normal tracking-tight text-[#f1f5f9] hover:text-[#cf7e5e] transition-colors">
              peter chatbot
            </span>
          </button>
        </div>

        {/* Minimalist Navigation: Only History and Settings */}
        <nav className="flex flex-col gap-3.5">
          {/* History option */}
          <button
            type="button"
            onClick={onOpenHistory}
            className={`flex items-center gap-2.5 text-sm transition-colors text-left group cursor-pointer ${
              historyOpen ? 'text-white' : 'text-[#9ca3af] hover:text-white'
            }`}
            title="View chat history"
          >
            <History size={16} className="text-[#9ca3af] group-hover:text-white transition-colors flex-shrink-0" />
            <span className="font-normal">History</span>
            {sessions.length > 0 && (
              <span className="text-[10px] text-[#6b7280] group-hover:text-[#9ca3af] ml-auto font-mono">
                {sessions.length}
              </span>
            )}
          </button>

          {/* Settings option */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 text-sm text-[#9ca3af] hover:text-white transition-colors text-left group cursor-pointer"
            title="Open settings"
          >
            <Settings size={16} className="text-[#9ca3af] group-hover:text-white transition-colors flex-shrink-0" />
            <span className="font-normal">Settings</span>
          </button>
        </nav>
      </div>

      {/* History Slide-Out Drawer / Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseHistory}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-label="Close history"
          />

          {/* Drawer content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#111318] border-r border-[#262a34] p-4 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262a34]">
              <div className="flex items-center gap-2 text-sm font-medium text-[#e2e8f0]">
                <History size={16} className="text-[#cf7e5e]" />
                <span>Chat History</span>
              </div>
              <button
                onClick={onCloseHistory}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f232d] transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* New conversation button */}
            <div className="pt-3 pb-2">
              <button
                onClick={() => {
                  onNewConversation()
                  onCloseHistory()
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1d2028] hover:bg-[#252934] border border-[#2e3340] text-xs font-medium text-[#e2e8f0] transition-colors shadow-sm"
              >
                <Plus size={14} className="text-[#cf7e5e]" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto space-y-1 py-2 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No previous conversations yet
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = activeSessionId === session.id
                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        onSelectSession(session.id)
                        onCloseHistory()
                      }}
                      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all select-none ${
                        isActive
                          ? 'bg-[#1e222b] text-[#f1f5f9] font-medium border border-[#373c4b]'
                          : 'text-[#9ca3af] hover:text-[#f1f5f9] hover:bg-[#171920]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare
                          size={13}
                          className={`flex-shrink-0 ${isActive ? 'text-[#cf7e5e]' : 'text-[#64748b]'}`}
                        />
                        <span className="truncate">{session.title || 'Conversation'}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] text-[#64748b] font-mono group-hover:hidden">
                          {formatRelativeTime(session.timestamp)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                          }}
                          className="hidden group-hover:flex p-1 rounded hover:bg-[#2d1b1b] text-[#8b95a5] hover:text-red-400 transition-colors"
                          title="Delete chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Drawer footer */}
            {sessions.length > 0 && onClearAllHistory && (
              <div className="pt-3 border-t border-[#262a34]">
                <button
                  onClick={() => {
                    if (window.confirm('Clear all conversation history?')) {
                      onClearAllHistory()
                    }
                  }}
                  className="w-full text-center text-xs text-neutral-500 hover:text-red-400 py-1 transition-colors"
                >
                  Clear all history
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
