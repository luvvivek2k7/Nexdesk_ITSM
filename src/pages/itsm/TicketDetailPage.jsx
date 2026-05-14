// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket Detail Page
// Full ticket view: SLA timer, timeline, comments, status transitions, AI
// Real-time Firestore listener
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { toast }                       from 'react-hot-toast'
import {
  ArrowLeft, Send, Lock, Unlock, User, Clock,
  Tag, AlertTriangle, CheckCircle, RefreshCw,
  ChevronDown, Paperclip, Sparkles, History,
} from 'lucide-react'
import { useAuth }         from '@/context/AuthContext'
import {
  listenToTicket, updateTicketStatus,
  addComment, assignTicket, updateTicket,
} from '@/lib/ticketService'
import { calculateSLA, formatRemaining, getSLABarColor } from '@/lib/sla'
import { TICKET_STATUS, TICKET_TYPES, SLA_POLICIES, CATEGORIES, ROLES } from '@/lib/constants'
import {
  Card, CardHeader, Badge, PriorityBadge, StatusBadge,
  SLABadge, Button, AIInsight, SLABar, Spinner, Divider,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

// ── Live countdown hook ───────────────────────────────────────────────────────
function useLiveCountdown(dueAt) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!dueAt) return
    const tick = () => setRemaining(dueAt - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [dueAt])
  return remaining
}

// ── Format ms countdown ───────────────────────────────────────────────────────
function fmtCountdown(ms) {
  if (ms === null) return '—'
  const abs = Math.abs(ms)
  const h   = Math.floor(abs / 3600000)
  const m   = Math.floor((abs % 3600000) / 60000)
  const s   = Math.floor((abs % 60000) / 1000)
  const neg = ms < 0 ? '-' : ''
  if (h > 0) return `${neg}${h}h ${m}m`
  return `${neg}${m}m ${s}s`
}

// ── Status transition button ──────────────────────────────────────────────────
function StatusDropdown({ ticket, onUpdate, disabled }) {
  const [open, setOpen] = useState(false)
  const allowed = TICKET_STATUS[ticket.status]?.next ?? []

  if (!allowed.length || disabled) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(p => !p)}
        icon={ChevronDown}
        disabled={disabled}
      >
        Change Status
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-xl overflow-hidden z-20 py-1"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          }}
        >
          {allowed.map(s => (
            <button
              key={s}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => { onUpdate(s); setOpen(false) }}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Comment bubble ────────────────────────────────────────────────────────────
function CommentBubble({ comment, isOwn }) {
  const date = comment.createdAt?.toDate?.() ?? new Date(comment.createdAt)
  return (
    <div className={clsx('flex gap-2.5', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white mt-1"
        style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
      >
        {comment.authorName?.charAt(0) ?? 'U'}
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[80%]', isOwn && 'items-end')}>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{comment.authorName}</span>
          <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
          {comment.isInternal && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
              <Lock size={9} /> Internal
            </span>
          )}
        </div>
        <div
          className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            background: isOwn ? 'var(--accent)' : 'var(--bg-elevated)',
            color: isOwn ? '#fff' : 'var(--text-primary)',
            border: isOwn ? 'none' : '1px solid var(--border-subtle)',
            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {comment.text}
        </div>
      </div>
    </div>
  )
}

// ── History entry ─────────────────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  const date = entry.at?.toDate?.() ?? new Date(entry.at)
  const changes = Object.entries(entry.changes ?? {})

  return (
    <div className="flex gap-2.5 pb-3">
      <div className="flex flex-col items-center">
        <div
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: 'var(--border-strong)' }}
        />
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border-subtle)' }} />
      </div>
      <div className="pb-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {entry.by}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {entry.action}d
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            · {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
        {changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {changes.map(([field, { from, to }]) => (
              <p key={field} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>:
                {from && <> <span className="line-through">{String(from)}</span> →</>}
                {' '}<span style={{ color: 'var(--text-secondary)' }}>{String(to)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, profile, isAgent, role } = useAuth()

  const [ticket,       setTicket]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [commentText,  setCommentText]  = useState('')
  const [isInternal,   setIsInternal]   = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activeTab,    setActiveTab]    = useState('comments') // comments | history
  const commentsEndRef = useRef(null)

  // Real-time listener
  useEffect(() => {
    if (!id) return
    const unsub = listenToTicket(id, (data) => {
      setTicket(data)
      setLoading(false)
    })
    return unsub
  }, [id])

  // Scroll to bottom of comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.comments])

  // Computed SLA
  const sla = ticket ? calculateSLA(ticket) : null
  const countdown = useLiveCountdown(sla?.resolution?.dueAt ?? null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={24} />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Ticket not found</p>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/itsm/tickets')}>
          Back to Tickets
        </Button>
      </div>
    )
  }

  const canEdit    = isAgent
  const isResolved = ['RESOLVED', 'CLOSED'].includes(ticket.status)
  const typeMeta   = TICKET_TYPES[ticket.type]
  const catMeta    = CATEGORIES.find(c => c.id === ticket.category)

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(id, newStatus, { uid: user.uid, displayName: profile?.displayName, email: user.email })
      toast.success(`Status updated to ${TICKET_STATUS[newStatus]?.label}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      await addComment(
        id,
        { text: commentText.trim(), isInternal },
        { uid: user.uid, displayName: profile?.displayName, email: user.email, photoURL: user.photoURL }
      )
      setCommentText('')
      toast.success('Comment added')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingComment(false)
    }
  }

  const handleAssignToMe = async () => {
    try {
      await assignTicket(id, { assigneeId: user.uid, assigneeName: profile?.displayName }, { uid: user.uid, displayName: profile?.displayName })
      toast.success('Ticket assigned to you')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in pb-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/itsm/tickets')}>
          Tickets
        </Button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span className="font-mono text-sm text-blue-400">{ticket.ticketId}</span>
      </div>

      {/* ── SLA Breach Banner ── */}
      {sla?.resolution.breached && !isResolved && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm animate-pulse"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 font-semibold">SLA Breached</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            This ticket exceeded its resolution target of {SLA_POLICIES[ticket.priority]?.resolutionHours}h.
            Immediate action required.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Main content ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title & metadata */}
          <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {ticket.ticketId}
                  </span>
                  {typeMeta && (
                    <Badge variant={typeMeta.color}>{typeMeta.label}</Badge>
                  )}
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.slaBreached && <SLABadge status="breached" />}
                </div>
                <h1 className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {ticket.title}
                </h1>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Requester', value: ticket.requesterName, icon: User },
                { label: 'Category',  value: catMeta ? `${catMeta.icon} ${catMeta.label}` : ticket.category, icon: Tag },
                { label: 'Assignee',  value: ticket.assigneeName ?? 'Unassigned', icon: User },
                { label: 'Created',
                  value: ticket.createdAt?.toDate
                    ? format(ticket.createdAt.toDate(), 'dd MMM yyyy, HH:mm')
                    : '—',
                  icon: Clock },
                { label: 'Updated',
                  value: ticket.updatedAt?.toDate
                    ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true })
                    : '—',
                  icon: RefreshCw },
                { label: 'Resolution Target',
                  value: `${SLA_POLICIES[ticket.priority]?.resolutionHours}h`,
                  icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}
                  className="rounded-lg p-2.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={11} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </p>
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Description
              </p>
              <div
                className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {ticket.description || <span style={{ color: 'var(--text-muted)' }}>No description provided.</span>}
              </div>
            </div>

            {/* Tags */}
            {ticket.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Tag size={12} style={{ color: 'var(--text-muted)' }} />
                {ticket.tags.map(tag => (
                  <span key={tag}
                    className="px-2 py-0.5 rounded-full text-[11px]"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* ── Comments / History ── */}
          <Card padding={false}>
            {/* Tab header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex gap-0">
                {['comments', 'history'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors',
                      activeTab === tab
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent hover:text-[var(--text-primary)]'
                    )}
                    style={{ color: activeTab === tab ? undefined : 'var(--text-muted)' }}
                  >
                    {tab} {tab === 'comments' && `(${ticket.comments?.length ?? 0})`}
                  </button>
                ))}
              </div>
              {activeTab === 'comments' && isAgent && (
                <button
                  onClick={() => setIsInternal(p => !p)}
                  className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors"
                  style={{
                    background: isInternal ? 'var(--warning-subtle)' : 'var(--bg-elevated)',
                    color: isInternal ? 'var(--warning)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {isInternal ? <Lock size={11} /> : <Unlock size={11} />}
                  {isInternal ? 'Internal' : 'Public'}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {activeTab === 'comments' && (
                <>
                  {(!ticket.comments || ticket.comments.length === 0) ? (
                    <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                      No comments yet. Be the first to add one.
                    </p>
                  ) : (
                    ticket.comments.map(c => (
                      <CommentBubble
                        key={c.id}
                        comment={c}
                        isOwn={c.authorId === user.uid}
                      />
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </>
              )}

              {activeTab === 'history' && (
                <div>
                  {(!ticket.history || ticket.history.length === 0) ? (
                    <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                      No history recorded.
                    </p>
                  ) : (
                    [...ticket.history].reverse().map((entry, i) => (
                      <HistoryEntry key={i} entry={entry} />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Comment input */}
            {activeTab === 'comments' && (
              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {isInternal && (
                  <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                    <Lock size={10} /> This comment will only be visible to agents and admins
                  </p>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
                    }}
                    placeholder={isResolved
                      ? 'Ticket is resolved. Add a comment to reopen…'
                      : 'Add a comment… (Ctrl+Enter to send)'}
                    rows={2}
                    className="nd-input flex-1 resize-none text-sm"
                  />
                  <Button
                    icon={Send}
                    loading={sendingComment}
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="self-end flex-shrink-0"
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">

          {/* SLA panel */}
          <Card>
            <CardHeader title="SLA Status" />
            {sla ? (
              <div className="space-y-4">
                {/* Live countdown */}
                <div className="text-center p-3 rounded-xl"
                  style={{
                    background: sla.resolution.breached ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                    border: `1px solid ${sla.resolution.breached ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  }}>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    Resolution {sla.resolution.breached ? 'Breached by' : 'Remaining'}
                  </p>
                  <p className={clsx(
                    'text-xl font-bold font-mono',
                    sla.resolution.breached ? 'text-red-400'
                    : countdown !== null && countdown < 3600000 ? 'text-amber-400'
                    : 'text-green-400'
                  )}>
                    {fmtCountdown(countdown)}
                  </p>
                </div>

                {/* Response SLA */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>Response SLA</span>
                    <SLABadge status={sla.response.status} />
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sla.response.percentage}%`,
                        background: getSLABarColor(sla.response.status),
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {sla.response.percentage}% · Target: {SLA_POLICIES[ticket.priority]?.responseMinutes / 60}h
                  </p>
                </div>

                {/* Resolution SLA */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>Resolution SLA</span>
                    <SLABadge status={sla.resolution.status} />
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sla.resolution.percentage}%`,
                        background: getSLABarColor(sla.resolution.status),
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {sla.resolution.percentage}% · Target: {sla.policy.resolutionHours}h
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>SLA data unavailable</p>
            )}
          </Card>

          {/* Agent actions */}
          {canEdit && (
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-2">
                <StatusDropdown
                  ticket={ticket}
                  onUpdate={handleStatusUpdate}
                  disabled={updatingStatus}
                />

                {!ticket.assigneeId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    icon={User}
                    onClick={handleAssignToMe}
                  >
                    Assign to Me
                  </Button>
                )}

                {ticket.status !== 'RESOLVED' && (
                  <Button
                    variant="success"
                    size="sm"
                    className="w-full"
                    icon={CheckCircle}
                    onClick={() => handleStatusUpdate('RESOLVED')}
                    loading={updatingStatus}
                  >
                    Mark Resolved
                  </Button>
                )}

                {ticket.status === 'RESOLVED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    icon={RefreshCw}
                    onClick={() => handleStatusUpdate('OPEN')}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* AI Insight */}
          {isAgent && (
            <AIInsight type={
              sla?.resolution.breached ? 'danger'
              : sla?.resolution.status === 'at_risk' ? 'warning'
              : 'info'
            }>
              {sla?.resolution.breached
                ? <>This ticket has <strong>breached SLA</strong>. Recommend immediate escalation and customer communication.</>
                : sla?.resolution.status === 'at_risk'
                ? <>SLA is <strong>at risk</strong>. Prioritise resolution in the next {Math.round((sla.resolution.remainingMs ?? 0) / 3600000)}h.</>
                : ticket.assigneeId
                ? <>Ticket assigned to <strong>{ticket.assigneeName}</strong>. On track for timely resolution.</>
                : <>Ticket is <strong>unassigned</strong>. Auto-assignment recommended based on category: {ticket.category}.</>
              }
            </AIInsight>
          )}

          {/* Ticket info */}
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-2 text-xs">
              {[
                { label: 'Ticket ID',  value: ticket.ticketId },
                { label: 'Type',       value: TICKET_TYPES[ticket.type]?.label ?? ticket.type },
                { label: 'Priority',   value: ticket.priority },
                { label: 'Category',   value: catMeta?.label ?? ticket.category },
                { label: 'Requester',  value: ticket.requesterName },
                { label: 'Requester Email', value: ticket.requesterEmail },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
