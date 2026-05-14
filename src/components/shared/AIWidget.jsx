// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — AI Widget
// Persistent conversational AI assistant powered by Claude API
// Docked bottom-right, collapsible, context-aware
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation }    from 'react-router-dom'
import { X, Send, Mic, Bot, Minus, Maximize2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import clsx        from 'clsx'

// ── Context-aware prompts ─────────────────────────────────────────────────────
const CONTEXT_PROMPTS = {
  '/portal':  ['How many open tickets?', 'Show SLA status',         'What needs attention today?'],
  '/itsm':    ['Summarise today\'s tickets', 'Any SLA breaches?',   'Assign unassigned tickets'],
  '/itsm/sla':['Which tickets are at risk?', 'Show P1 countdown',   'Escalation rules'],
  '/admin':   ['Who has access issues?',     'Show user activity',  'Role distribution'],
}

// ── AI response builder (local logic — swap for Claude API in Phase 2) ────────
function buildResponse(msg, location, profile) {
  const m   = msg.toLowerCase()
  const page = location.pathname

  if (/sla|breach|risk/.test(m))
    return '📊 Current SLA: **2 tickets breached**, 3 at risk. INC-001 is most critical — 12 minutes overdue. Recommend immediate escalation to L2. [View SLA →](/itsm/sla)'

  if (/ticket|incident|open/.test(m))
    return '🎫 You have **7 open tickets** right now. 2 are P1 Critical (network outage). Would you like me to auto-escalate the unassigned ones?'

  if (/assign|unassign/.test(m))
    return '👤 There are **3 unassigned tickets** in the queue. Based on workload, I recommend assigning INC-003 to Ravi Kumar and REQ-007 to Priya Nair. Shall I do that?'

  if (/knowledge|kb|article/.test(m))
    return '📖 Top KB articles this week: **VPN Troubleshooting** (1.2k views), **Password Reset Guide** (892 views). The VPN article resolves ~34% of network tickets without escalation.'

  if (/report|analytics|stats/.test(m))
    return '📈 This week: **114 tickets created**, 98 resolved. CSAT is at **94%**. MTTR improved by 18 minutes vs last week. SLA compliance: 87.5%.'

  if (/user|who|access/.test(m))
    return '👥 There are **6 registered users** in NexDesk. 2 agents, 1 manager, 1 admin, 2 standard users. [Manage users →](/admin/users)'

  if (/hello|hi|hey/.test(m))
    return `👋 Hello ${profile?.displayName?.split(' ')[0] ?? 'there'}! I'm your NexDesk AI. I can help with tickets, SLA tracking, user management, and more. What do you need?`

  if (/phase|roadmap|plan/.test(m))
    return '🗺 **Phase 1 (now):** ITSM core, SLA engine, auth. **Phase 2:** ITAM, IAM, FSO, Visitor Mgmt. **Phase 3:** HRMS, Chatbot, Voicebot (Twilio). **Phase 4:** Multi-tenant, custom SSO.'

  return `🤖 I searched NexDesk for **"${msg}"**. I can help with ticket management, SLA queries, user access, reports, and platform navigation. Try asking: *"show me breached tickets"* or *"how many open P1s?"*`
}

// ── Markdown-ish renderer ─────────────────────────────────────────────────────
function renderMsg(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>')
}

const INITIAL_MESSAGES = [
  {
    id:   'init',
    role: 'bot',
    text: '👋 Hi! I\'m your **NexDesk AI Assistant**. I can help with tickets, SLA tracking, user management, and platform navigation.\n\nWhat do you need help with today?',
    ts:   Date.now(),
  },
]

export default function AIWidget() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile } = useAuth()

  const [open,     setOpen]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input,    setInput]    = useState('')
  const [typing,   setTyping]   = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const sendMessage = async (text = input.trim()) => {
    if (!text) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', text, ts: Date.now() }
    setMessages(p => [...p, userMsg])
    setTyping(true)

    // Simulate AI thinking (replace with real Claude API call in Phase 2)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

    const botText = buildResponse(text, location, profile)
    const botMsg  = { id: Date.now() + 1, role: 'bot', text: botText, ts: Date.now() }

    setMessages(p => [...p, botMsg])
    setTyping(false)
  }

  const contextPrompts = CONTEXT_PROMPTS[location.pathname] ?? CONTEXT_PROMPTS['/portal']

  const widgetWidth  = expanded ? 420 : 320
  const widgetHeight = expanded ? 560 : 420

  return (
    <>
      {/* ── Collapsed FAB ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl flex items-center justify-center shadow-modal transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          title="Open AI Assistant"
        >
          <Bot size={22} className="text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[var(--bg-base)] text-[9px] text-white font-bold flex items-center justify-center">
            AI
          </span>
        </button>
      )}

      {/* ── Expanded widget ── */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-modal"
          style={{
            width:   widgetWidth,
            height:  widgetHeight,
            background: 'var(--bg-elevated)',
            border:  '1px solid var(--border-default)',
            transition: 'width .2s, height .2s',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,rgba(59,98,245,0.15),rgba(124,58,237,0.12))',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
            >
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>NexDesk AI</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {typing ? 'Thinking…' : 'Online · Context-aware'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(p => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title={expanded ? 'Shrink' : 'Expand'}
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Close"
              >
                <Minus size={12} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={clsx('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}
              >
                {msg.role === 'bot' && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
                  >
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
                  style={{
                    background:    msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                    color:         msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    border:        msg.role === 'bot' ? '1px solid var(--border-subtle)' : 'none',
                    borderRadius:  msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMsg(msg.text) }}
                  onClick={e => {
                    // Handle link clicks inside AI messages
                    const link = e.target.closest('a')
                    if (link) { e.preventDefault(); navigate(link.getAttribute('href')); setOpen(false) }
                  }}
                />
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                  <Bot size={12} className="text-white" />
                </div>
                <div className="rounded-2xl px-3.5 py-3 flex items-center gap-1"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Context prompts */}
          {contextPrompts && messages.length <= 2 && (
            <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
              {contextPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    background:  'var(--accent-subtle)',
                    border:      '1px solid var(--accent-border)',
                    color:       'var(--accent)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about tickets, SLA, users…"
              className="flex-1 bg-transparent border-none outline-none text-xs"
              style={{ color: 'var(--text-primary)' }}
              disabled={typing}
            />
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-muted)',
              }}
              title="Voice input (Phase 3)"
            >
              <Mic size={12} />
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
