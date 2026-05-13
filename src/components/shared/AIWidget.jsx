// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — AI Chatbot Widget (Phase 2 — Real Claude API)
// Docked bottom-right, context-aware, full conversational AI
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Bot, Minus, Maximize2, Loader, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import clsx from 'clsx'

const CONTEXT_PROMPTS = {
  '/portal':     ['How many open tickets?', 'SLA status overview',     'What needs attention?'],
  '/itsm':       ["Today's ticket summary", 'Any SLA breaches?',       'Assign unassigned tickets'],
  '/itsm/sla':   ['Which tickets at risk?', 'Show P1 countdown',       'Escalation rules?'],
  '/itam':       ['Assets expiring soon?',  'Unassigned hardware?',    'License compliance?'],
  '/reports':    ['Top incident categories','Agent performance tips',   'SLA improvement ideas?'],
  '/admin':      ['User access issues?',    'Role distribution',        'Pending approvals?'],
}

function renderMsg(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:4px;font-size:11px">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>')
}

const SYSTEM_PROMPT = (profile, location, role) => `You are NexDesk AI, an intelligent IT service management assistant embedded in the NexDesk platform. You help IT teams manage tickets, assets, SLAs, and workflows efficiently.

Current user: ${profile?.displayName ?? 'User'} | Role: ${role} | Page: ${location}

You have deep knowledge of:
- ITSM best practices (ITIL v4): incident, problem, change, service request management
- SLA policies and breach management
- IT Asset Management (ITAM): lifecycle, procurement, assignment, disposal
- Team productivity and ticket routing optimization
- NexDesk platform navigation and features

Be concise, actionable, and professional. Use bullet points for lists. Highlight critical items with **bold**. When suggesting actions, be specific. Keep responses under 200 words unless the user needs detailed explanation.

Platform context:
- Phase 1 (Live): ITSM ticketing, SLA engine, user management, knowledge base
- Phase 2 (Live): ITAM asset management, reports & analytics, workflow automation, AI assistant
- Phase 3 (Planned): IAM, HRMS, Field Services, Visitor Management

Do not make up specific ticket IDs, user names, or numbers unless the user provides them. If asked for real-time data you don't have, explain you'd need to query the database and offer guidance instead.`

export default function AIWidget() {
  const location = useLocation()
  const { profile, role } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `👋 Hi ${profile?.displayName?.split(' ')[0] ?? 'there'}! I'm your NexDesk AI. Ask me anything about tickets, assets, SLAs, or platform navigation.` }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const page      = '/' + (location.pathname.split('/')[1] || '')
  const prompts   = CONTEXT_PROMPTS[page] ?? CONTEXT_PROMPTS['/portal']

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  const sendMessage = async (text) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg    = { role: 'user', content: msg }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    try {
      const apiMessages = newHistory
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: SYSTEM_PROMPT(profile, location.pathname, role),
          messages: apiMessages,
        }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const reply = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('AI error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your internet connection or try again in a moment. For urgent issues, use the ticket system directly.",
      }])
    } finally { setLoading(false) }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const w = expanded ? 420 : 340
  const h = expanded ? 560 : 440

  return (
    <>
      {/* Trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-xl z-50 transition-transform hover:scale-110"
          style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)', boxShadow: '0 4px 24px rgba(59,98,245,0.5)' }}
        >
          <Sparkles size={20} color="#fff" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 flex flex-col rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{
            width: w, height: h,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            transition: 'width 0.2s, height 0.2s',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">NexDesk AI</p>
                <p className="text-[10px] text-white/70 mt-0.5">{loading ? 'Thinking…' : 'Online'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded(p => !p)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <Maximize2 size={13} color="#fff" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X size={13} color="#fff" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)' }}>
                    <Sparkles size={11} color="#fff" />
                  </div>
                )}
                <div
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                  style={{
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMsg(m.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)' }}>
                  <Sparkles size={11} color="#fff" />
                </div>
                <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
                  <Loader size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Context prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {prompts.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)}
                  className="text-[10px] px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about NexDesk…"
                rows={1}
                style={{ resize: 'none', background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: 12, color: 'var(--text-primary)', lineHeight: '1.5', maxHeight: 80, overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg flex-shrink-0 transition-opacity disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                <Send size={12} color="#fff" />
              </button>
            </div>
            <p className="text-[9px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>Powered by Claude · NexDesk AI</p>
          </div>
        </div>
      )}
    </>
  )
}
