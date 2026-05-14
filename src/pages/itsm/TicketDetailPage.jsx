// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket Detail Page  v2
// Live updates, assignment group panel, history, notifications, full actions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { toast }                       from 'react-hot-toast'
import {
  ArrowLeft, Send, Lock, Unlock, User, Clock, Tag,
  AlertTriangle, CheckCircle, RefreshCw, ChevronDown,
  Users, History, Sparkles, Edit3,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  listenToTicket, updateTicketStatus, addComment, assignTicket, updateTicket,
} from '@/lib/ticketService'
import { getGroups } from '@/lib/assignmentService'
import { calculateSLA, formatRemaining, getSLABarColor } from '@/lib/sla'
import { TICKET_STATUS, TICKET_TYPES, SLA_POLICIES, CATEGORIES, ROLES } from '@/lib/constants'
import {
  Card, CardHeader, Badge, PriorityBadge, StatusBadge, SLABadge,
  Button, AIInsight, Spinner, Divider,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

// ── Live countdown ────────────────────────────────────────────────────────────
function useLiveCountdown(dueAt) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!dueAt) return
    const tick = () => setRemaining(dueAt - Date.now())
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [dueAt])
  return remaining
}

function fmtMs(ms) {
  if (ms === null) return '—'
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000)
  const neg = ms < 0 ? '-' : ''
  return h > 0 ? `${neg}${h}h ${m}m` : `${neg}${m}m ${s}s`
}

// ── Status dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ ticket, onUpdate, disabled }) {
  const [open, setOpen] = useState(false)
  const allowed = TICKET_STATUS[ticket.status]?.next ?? []
  if (!allowed.length || disabled) return null
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(p => !p)} disabled={disabled}>
        Change Status <ChevronDown size={12} className="ml-1" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-20 py-1"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
          {allowed.map(s => (
            <button key={s} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-[var(--bg-hover)]"
              onClick={() => { onUpdate(s); setOpen(false) }}>
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
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white mt-1"
        style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
        {comment.authorName?.charAt(0) ?? 'U'}
      </div>
      <div className={clsx('flex flex-col gap-1 max-w-[80%]', isOwn && 'items-end')}>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{comment.authorName}</span>
          <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
          {comment.isInternal && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}>
              <Lock size={9} /> Internal
            </span>
          )}
        </div>
        <div className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            background: isOwn ? 'var(--accent)' : 'var(--bg-elevated)',
            color: isOwn ? '#fff' : 'var(--text-primary)',
            border: isOwn ? 'none' : '1px solid var(--border-subtle)',
            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}>
          {comment.text}
        </div>
      </div>
    </div>
  )
}

// ── History entry ─────────────────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  const date = entry.at?.toDate?.() ?? new Date(entry.at ?? 0)
  const changes = Object.entries(entry.changes ?? {})
  return (
    <div className="flex gap-2.5 pb-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border-subtle)' }} />
      </div>
      <div className="pb-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.by}</span>
          <span className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>{entry.action}d</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>· {formatDistanceToNow(date, { addSuffix: true })}</span>
        </div>
        {changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {changes.map(([field, { from, to }]) => (
              <p key={field} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="capitalize font-medium">{field.replace(/([A-Z])/g, ' $1').replace('Id', ' ')}</span>:
                {from && <> <span className="line-through">{String(from)}</span> →</>} <span style={{ color: 'var(--text-secondary)' }}>{String(to)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Assignment Panel ──────────────────────────────────────────────────────────
function AssignmentPanel({ ticket, actor, isAgent }) {
  const [groups,        setGroups]        = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedMember,setSelectedMember]= useState('')
  const [saving,        setSaving]        = useState(false)
  const [expanded,      setExpanded]      = useState(false)

  useEffect(() => {
    if (isAgent) getGroups().then(setGroups).catch(console.error)
  }, [isAgent])

  // Pre-select current group/assignee
  useEffect(() => {
    if (ticket.assignmentGroupId && groups.length) {
      const g = groups.find(g => g.id === ticket.assignmentGroupId)
      setSelectedGroup(g ?? null)
      setSelectedMember(ticket.assigneeId ?? '')
    }
  }, [groups, ticket.assignmentGroupId, ticket.assigneeId])

  const handleAssign = async () => {
    const member = selectedGroup?.members?.find(m => m.uid === selectedMember)
    setSaving(true)
    try {
      await assignTicket(ticket.id, {
        assigneeId:          member?.uid  ?? null,
        assigneeName:        member?.name ?? null,
        assignmentGroupId:   selectedGroup?.id   ?? null,
        assignmentGroupName: selectedGroup?.name ?? null,
      }, actor)
      toast.success(member ? `Assigned to ${member.name}` : `Assigned to group ${selectedGroup?.name}`)
      setExpanded(false)
    } catch (e) { toast.error('Failed to assign'); console.error(e) }
    finally { setSaving(false) }
  }

  const handleUnassign = async () => {
    setSaving(true)
    try {
      await assignTicket(ticket.id, { assigneeId: null, assigneeName: null, assignmentGroupId: null, assignmentGroupName: null }, actor)
      setSelectedGroup(null); setSelectedMember('')
      toast.success('Ticket unassigned')
    } catch (e) { toast.error('Failed to unassign') }
    finally { setSaving(false) }
  }

  if (!isAgent) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardHeader title="Assignment" />
        <button onClick={() => setExpanded(p => !p)} className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--accent)' }}>
          {expanded ? 'Cancel' : <Edit3 size={12} />}
        </button>
      </div>

      {/* Current assignment */}
      {!expanded && (
        <div className="space-y-2">
          {ticket.assignmentGroupName && (
            <div className="flex items-center gap-2 text-xs">
              <Users size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Group:</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{ticket.assignmentGroupName}</span>
            </div>
          )}
          {ticket.assigneeName ? (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                {ticket.assigneeName[0]}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ticket.assigneeName}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Current assignee</p>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not assigned to anyone</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setExpanded(true)}>
              {ticket.assigneeId ? 'Reassign' : 'Assign'}
            </Button>
            {ticket.assigneeId && (
              <Button size="sm" variant="ghost" loading={saving} onClick={handleUnassign}
                className="text-red-400">Unassign</Button>
            )}
          </div>
        </div>
      )}

      {/* Assignment editor */}
      {expanded && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Assignment Group</label>
            <select value={selectedGroup?.id ?? ''} className="nd-input w-full"
              onChange={e => {
                const g = groups.find(g => g.id === e.target.value) ?? null
                setSelectedGroup(g); setSelectedMember('')
              }}>
              <option value="">— No group —</option>
              {groups.filter(g => g.active).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {selectedGroup && (selectedGroup.members?.length ?? 0) > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                Assignee ({selectedGroup.members.length} members)
              </label>
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="nd-input w-full">
                <option value="">— Group only, no individual —</option>
                {selectedGroup.members.map(m => <option key={m.uid} value={m.uid}>{m.name} — {m.email}</option>)}
              </select>
            </div>
          )}

          {selectedGroup && (selectedGroup.members?.length ?? 0) === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No members in this group yet.</p>
          )}

          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={handleAssign} className="flex-1">Save Assignment</Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, profile, isAgent } = useAuth()

  const [ticket,         setTicket]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [commentText,    setCommentText]    = useState('')
  const [isInternal,     setIsInternal]     = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activeTab,      setActiveTab]      = useState('comments')
  const commentsEndRef = useRef(null)

  const actor = { uid: user?.uid, displayName: profile?.displayName, email: user?.email }

  useEffect(() => {
    if (!id) return
    const unsub = listenToTicket(id, data => { setTicket(data); setLoading(false) },
      () => setLoading(false))
    return unsub
  }, [id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.comments])

  const sla      = ticket ? calculateSLA(ticket) : null
  const countdown = useLiveCountdown(sla?.resolution?.dueAt ?? null)

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={24} /></div>
  if (!ticket) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
      <p style={{ color: 'var(--text-muted)' }}>Ticket not found</p>
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/itsm/tickets')}>Back</Button>
    </div>
  )

  const isResolved = ['RESOLVED','CLOSED'].includes(ticket.status)
  const typeMeta   = TICKET_TYPES[ticket.type]
  const catMeta    = CATEGORIES.find(c => c.id === ticket.category)

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(id, newStatus, actor)
      toast.success(`Status → ${TICKET_STATUS[newStatus]?.label}`)
    } catch (e) { toast.error(e.message) }
    finally { setUpdatingStatus(false) }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      await addComment(id, { text: commentText.trim(), isInternal }, { ...actor, photoURL: user?.photoURL })
      setCommentText('')
    } catch (e) { toast.error(e.message) }
    finally { setSendingComment(false) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/itsm/tickets')}>Tickets</Button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span className="font-mono text-sm text-blue-400">{ticket.ticketId}</span>
      </div>

      {/* SLA breach banner */}
      {sla?.resolution.breached && !isResolved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 font-semibold">SLA Breached</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Exceeded {SLA_POLICIES[ticket.priority]?.resolutionHours}h target. Immediate action required.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <code className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {ticket.ticketId}
                  </code>
                  {typeMeta && <Badge variant={typeMeta.color}>{typeMeta.label}</Badge>}
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.slaBreached && <SLABadge status="breached" />}
                </div>
                <h1 className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{ticket.title}</h1>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Requester',   value: ticket.requesterName },
                { label: 'Category',    value: catMeta ? `${catMeta.icon} ${catMeta.label}` : ticket.category },
                { label: 'Assignee',    value: ticket.assigneeName ?? 'Unassigned' },
                { label: 'Group',       value: ticket.assignmentGroupName ?? 'None' },
                { label: 'Created',     value: ticket.createdAt?.toDate ? format(ticket.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : '—' },
                { label: 'Updated',     value: ticket.updatedAt?.toDate ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
              <div className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                {ticket.description || <span style={{ color: 'var(--text-muted)' }}>No description provided.</span>}
              </div>
            </div>

            {/* Tags */}
            {ticket.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Tag size={12} style={{ color: 'var(--text-muted)' }} />
                {ticket.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[11px]"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Comments / History */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 pt-3 pb-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex">
                {['comments','history'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                      activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent'
                    }`}
                    style={{ color: activeTab === tab ? undefined : 'var(--text-muted)' }}>
                    {tab}{tab === 'comments' ? ` (${ticket.comments?.length ?? 0})` : ` (${ticket.history?.length ?? 0})`}
                  </button>
                ))}
              </div>
              {activeTab === 'comments' && isAgent && (
                <button onClick={() => setIsInternal(p => !p)}
                  className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg"
                  style={{
                    background: isInternal ? 'rgba(234,179,8,0.1)' : 'var(--bg-elevated)',
                    color: isInternal ? '#ca8a04' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                  {isInternal ? <Lock size={11} /> : <Unlock size={11} />}
                  {isInternal ? 'Internal note' : 'Public reply'}
                </button>
              )}
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {activeTab === 'comments' && (
                <>
                  {(!ticket.comments || ticket.comments.length === 0)
                    ? <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
                    : ticket.comments
                        .filter(c => !c.isInternal || isAgent)
                        .map(c => <CommentBubble key={c.id} comment={c} isOwn={c.authorId === user?.uid} />)
                  }
                  <div ref={commentsEndRef} />
                </>
              )}
              {activeTab === 'history' && (
                <div>
                  {(!ticket.history || ticket.history.length === 0)
                    ? <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>No history yet.</p>
                    : [...ticket.history].reverse().map((e, i) => <HistoryEntry key={i} entry={e} />)
                  }
                </div>
              )}
            </div>

            {/* Comment input */}
            {activeTab === 'comments' && (
              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {isInternal && (
                  <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: '#ca8a04' }}>
                    <Lock size={10} /> Only agents and admins will see this note
                  </p>
                )}
                <div className="flex gap-2">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment() }}
                    placeholder={isResolved ? 'Add a comment to reopen…' : 'Add a comment… (Ctrl+Enter to send)'}
                    rows={2} className="nd-input flex-1 resize-none text-sm" />
                  <Button icon={Send} loading={sendingComment} onClick={handleComment}
                    disabled={!commentText.trim()} className="self-end flex-shrink-0">
                    Send
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* SLA */}
          <Card>
            <CardHeader title="SLA Status" />
            {sla ? (
              <div className="space-y-4">
                <div className="text-center p-3 rounded-xl"
                  style={{
                    background: sla.resolution.breached ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                    border: `1px solid ${sla.resolution.breached ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  }}>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    Resolution {sla.resolution.breached ? 'Breached by' : 'Remaining'}
                  </p>
                  <p className={`text-xl font-bold font-mono ${
                    sla.resolution.breached ? 'text-red-400' : countdown !== null && countdown < 3600000 ? 'text-amber-400' : 'text-green-400'
                  }`}>{fmtMs(countdown)}</p>
                </div>
                {['response','resolution'].map(key => (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span style={{ color: 'var(--text-muted)' }} className="capitalize">{key} SLA</span>
                      <SLABadge status={sla[key].status} />
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${sla[key].percentage}%`, background: getSLABarColor(sla[key].status) }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>SLA data unavailable</p>}
          </Card>

          {/* Assignment panel */}
          <AssignmentPanel ticket={ticket} actor={actor} isAgent={isAgent} />

          {/* Actions */}
          {isAgent && (
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-2">
                <StatusDropdown ticket={ticket} onUpdate={handleStatusUpdate} disabled={updatingStatus} />
                {ticket.status !== 'RESOLVED' && (
                  <Button variant="ghost" size="sm" className="w-full" icon={CheckCircle}
                    onClick={() => handleStatusUpdate('RESOLVED')} loading={updatingStatus}>
                    Mark Resolved
                  </Button>
                )}
                {ticket.status === 'RESOLVED' && (
                  <Button variant="ghost" size="sm" className="w-full" icon={RefreshCw}
                    onClick={() => handleStatusUpdate('OPEN')}>Reopen</Button>
                )}
              </div>
            </Card>
          )}

          {/* AI Insight */}
          {isAgent && (
            <AIInsight type={sla?.resolution.breached ? 'danger' : sla?.resolution.status === 'at_risk' ? 'warning' : 'info'}>
              {sla?.resolution.breached
                ? <>SLA <strong>breached</strong>. Escalate immediately and notify stakeholders.</>
                : sla?.resolution.status === 'at_risk'
                ? <>SLA at risk. Resolve within <strong>{Math.round((sla.resolution.remainingMs ?? 0) / 3600000)}h</strong>.</>
                : ticket.assigneeId
                ? <>Assigned to <strong>{ticket.assigneeName}</strong>. On track.</>
                : <>Ticket unassigned. Recommend assigning to a group.</>
              }
            </AIInsight>
          )}

          {/* Details */}
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-2 text-xs">
              {[
                { label: 'Ticket ID',   value: ticket.ticketId },
                { label: 'Type',        value: TICKET_TYPES[ticket.type]?.label ?? ticket.type },
                { label: 'Priority',    value: ticket.priority },
                { label: 'Category',    value: catMeta?.label ?? ticket.category },
                { label: 'Requester',   value: ticket.requesterName },
                { label: 'Email',       value: ticket.requesterEmail },
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
