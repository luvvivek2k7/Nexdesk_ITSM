// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket List Page
// Filterable, sortable ticket table with real-time Firestore listener
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, Download, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useAuth }            from '@/context/AuthContext'
import { listenToTickets }    from '@/lib/ticketService'
import { calculateSLA }       from '@/lib/sla'
import { TICKET_STATUS, TICKET_TYPES, SLA_POLICIES, ROLES } from '@/lib/constants'
import {
  Card, Button, Badge, PriorityBadge, StatusBadge,
  SLABadge, EmptyState, Spinner,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest first'    },
  { value: 'createdAt_asc',  label: 'Oldest first'    },
  { value: 'priority_asc',   label: 'Priority (P1→P4)' },
  { value: 'sla_desc',       label: 'SLA Risk first'  },
]

export default function TicketListPage() {
  const navigate            = useNavigate()
  const [searchParams]      = useSearchParams()
  const { profile, role, isAgent } = useAuth()

  // State
  const [tickets,    setTickets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') ?? 'ALL')
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') ?? 'ALL')
  const [filterType,     setFilterType]     = useState(searchParams.get('type') ?? 'ALL')
  const [sortBy,     setSortBy]     = useState('createdAt_desc')
  const [showFilters,setShowFilters] = useState(false)

  // Real-time listener
  useEffect(() => {
    if (!profile) return  // wait for profile to load before subscribing
    const filters = {}
    // Regular users only see their own tickets (by uid from auth, not profile)
    if (role === ROLES.USER) filters.requesterId = profile.uid ?? profile.id
    const unsub = listenToTickets(filters, (data) => {
      setTickets(data)
      setLoading(false)
    }, (err) => {
      console.error('Ticket listener error:', err)
      setLoading(false)
    })
    return unsub
  }, [role, profile?.uid, profile?.id])

  // Enriched + filtered + sorted
  const filtered = useMemo(() => {
    let result = tickets.map(t => ({ ...t, sla: calculateSLA(t) }))

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.ticketId?.toLowerCase().includes(q) ||
        t.requesterName?.toLowerCase().includes(q) ||
        t.assigneeName?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      )
    }

    // Filters
    if (filterStatus   !== 'ALL') result = result.filter(t => t.status   === filterStatus)
    if (filterPriority !== 'ALL') result = result.filter(t => t.priority === filterPriority)
    if (filterType     !== 'ALL') result = result.filter(t => t.type     === filterType)

    // Sort
    const [field, dir] = sortBy.split('_')
    result.sort((a, b) => {
      if (field === 'priority') {
        const order = { P1: 0, P2: 1, P3: 2, P4: 3 }
        return dir === 'asc'
          ? (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
          : (order[b.priority] ?? 9) - (order[a.priority] ?? 9)
      }
      if (field === 'sla') {
        return (b.sla?.resolution.percentage ?? 0) - (a.sla?.resolution.percentage ?? 0)
      }
      if (field === 'createdAt') {
        const aT = a.createdAt?.toDate?.()?.getTime?.() ?? 0
        const bT = b.createdAt?.toDate?.()?.getTime?.() ?? 0
        return dir === 'desc' ? bT - aT : aT - bT
      }
      return 0
    })

    return result
  }, [tickets, search, filterStatus, filterPriority, filterType, sortBy])

  // Summary counts
  const counts = useMemo(() => ({
    total:    tickets.length,
    open:     tickets.filter(t => ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status)).length,
    breached: tickets.filter(t => t.slaBreached).length,
    p1:       tickets.filter(t => t.priority === 'P1' && !['RESOLVED','CLOSED'].includes(t.status)).length,
  }), [tickets])

  const activeFilters = [filterStatus, filterPriority, filterType].filter(f => f !== 'ALL').length

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {role === ROLES.USER ? 'My Tickets' : 'All Tickets'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} of {tickets.length} tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw}>Refresh</Button>
          {isAgent && (
            <Button variant="ghost" size="sm" icon={Download}>Export CSV</Button>
          )}
          <Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>
            New Ticket
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Total',    value: counts.total,    color: 'default' },
          { label: 'Open',     value: counts.open,     color: 'blue'    },
          { label: 'Breached', value: counts.breached, color: 'red'     },
          { label: 'P1 Active',value: counts.p1,       color: 'red'     },
        ].map(({ label, value, color }) => (
          <span key={label} className={`nd-badge border text-xs font-semibold gap-1.5 px-3 py-1 ${
            color === 'red'     ? 'bg-red-500/10 text-red-400 border-red-500/20'    :
            color === 'blue'    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'  :
            'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]'
          }`}>
            <span className="font-mono font-bold">{value}</span> {label}
          </span>
        ))}
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-48 rounded-lg px-3 py-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by ID, title, requester…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant="ghost"
          size="sm"
          icon={SlidersHorizontal}
          onClick={() => setShowFilters(p => !p)}
          className={clsx(activeFilters > 0 && 'border-blue-500/50 text-blue-400')}
        >
          Filters {activeFilters > 0 && `(${activeFilters})`}
        </Button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="nd-input text-sm"
          style={{ width: 'auto' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', ...Object.keys(TICKET_STATUS)].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                      filterStatus === s
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'border text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                    style={{ borderColor: filterStatus === s ? undefined : 'var(--border-default)' }}
                  >
                    {s === 'ALL' ? 'All' : TICKET_STATUS[s]?.label ?? s}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Priority
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'P1', 'P2', 'P3', 'P4'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                      filterPriority === p
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                    style={{ borderColor: filterPriority === p ? undefined : 'var(--border-default)' }}
                  >
                    {p === 'ALL' ? 'All' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', ...Object.keys(TICKET_TYPES)].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                      filterType === t
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                    style={{ borderColor: filterType === t ? undefined : 'var(--border-default)' }}
                  >
                    {t === 'ALL' ? 'All' : TICKET_TYPES[t]?.label ?? t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeFilters > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterStatus('ALL'); setFilterPriority('ALL'); setFilterType('ALL') }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Ticket table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No tickets found"
            description={search || activeFilters > 0
              ? 'Try adjusting your search or filters.'
              : 'No tickets have been created yet.'}
            action={
              <Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>
                Raise First Ticket
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  {isAgent && <th>Requester</th>}
                  {isAgent && <th>Assignee</th>}
                  <th>SLA</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => {
                  const sla     = ticket.sla
                  const created = ticket.createdAt?.toDate?.()
                  const slaPct  = sla?.resolution?.percentage ?? 0
                  const slaColor = slaPct >= 90 ? '#ef4444' : slaPct >= 70 ? '#f97316' : '#22c55e'

                  return (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/itsm/tickets/${ticket.id}`)}
                    >
                      <td>
                        <div className="font-mono text-[11px] text-blue-400 mb-0.5">
                          {ticket.ticketId}
                        </div>
                        <div
                          className="text-[13px] font-medium max-w-xs"
                          style={{
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ticket.title}
                        </div>
                        {ticket.category && (
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {ticket.category}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {TICKET_TYPES[ticket.type]?.label ?? ticket.type}
                        </span>
                      </td>
                      <td><PriorityBadge priority={ticket.priority} /></td>
                      <td><StatusBadge status={ticket.status} /></td>
                      {isAgent && (
                        <td>
                          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            {ticket.requesterName}
                          </span>
                        </td>
                      )}
                      {isAgent && (
                        <td>
                          <span
                            className="text-[12px]"
                            style={{ color: ticket.assigneeName ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                          >
                            {ticket.assigneeName ?? 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td>
                        {sla && !['RESOLVED','CLOSED'].includes(ticket.status) ? (
                          <div className="min-w-[72px]">
                            <div className="flex justify-between text-[10px] mb-1">
                              <SLABadge status={sla.resolution.status} />
                              <span className="font-mono ml-1" style={{ color: 'var(--text-muted)' }}>
                                {slaPct}%
                              </span>
                            </div>
                            <div
                              className="w-full h-1 rounded-full overflow-hidden"
                              style={{ background: 'var(--bg-elevated)' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${slaPct}%`, background: slaColor }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {['RESOLVED','CLOSED'].includes(ticket.status) ? '✓ Done' : '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {created ? formatDistanceToNow(created, { addSuffix: true }) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
