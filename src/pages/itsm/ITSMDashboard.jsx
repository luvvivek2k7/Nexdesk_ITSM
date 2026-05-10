// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — ITSM Dashboard
// Persona-aware dashboard: Super Admin/IT Admin, IT Agent, Manager, User
// Real-time Firestore data
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, Users, Plus, RefreshCw,
  BarChart3, Activity,
} from 'lucide-react'
import { useAuth }        from '@/context/AuthContext'
import { ROLES, SLA_POLICIES, TICKET_STATUS } from '@/lib/constants'
import { listenToTickets, getTicketStats }    from '@/lib/ticketService'
import { calculateSLA, formatRemaining }      from '@/lib/sla'
import {
  StatCard, Card, CardHeader, Badge, PriorityBadge,
  StatusBadge, SLABadge, Button, AIInsight, SLABar, EmptyState,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow } from 'date-fns'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ── Mock trend data (will be real from Firestore in later phase) ──────────────
const TREND_DATA = [
  { day: 'Mon', incidents: 8,  requests: 14, resolved: 12 },
  { day: 'Tue', incidents: 12, requests: 18, resolved: 16 },
  { day: 'Wed', incidents: 6,  requests: 10, resolved: 14 },
  { day: 'Thu', incidents: 15, requests: 22, resolved: 18 },
  { day: 'Fri', incidents: 11, requests: 16, resolved: 20 },
  { day: 'Sat', incidents: 4,  requests: 6,  resolved: 8  },
  { day: 'Sun', incidents: 3,  requests: 4,  resolved: 5  },
]

const PIE_COLORS = {
  P1: '#ef4444', P2: '#f97316', P3: '#f59e0b', P4: '#3b62f5',
}

const CHART_COLORS = {
  incidents: '#ef4444',
  requests:  '#3b62f5',
  resolved:  '#22c55e',
}

// ── Tooltip style ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs shadow-lg"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function ITSMDashboard() {
  const { profile, role, isAdmin, isAgent } = useAuth()
  const navigate = useNavigate()

  const [tickets, setTickets]   = useState([])
  const [stats,   setStats]     = useState(null)
  const [loading, setLoading]   = useState(true)

  // ── Real-time ticket subscription ──────────────────────────────────────────
  useEffect(() => {
    const filters = {}
    // Agents/Admins see all; users see only theirs
    if (role === ROLES.USER) filters.requesterId = profile?.uid

    const unsub = listenToTickets(filters, (data) => {
      setTickets(data)
      setLoading(false)
    })
    return unsub
  }, [role, profile?.uid])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats_computed = {
    open:     tickets.filter(t => ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status)).length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    breached: tickets.filter(t => t.slaBreached).length,
    p1Active: tickets.filter(t => t.priority === 'P1' && !['RESOLVED','CLOSED'].includes(t.status)).length,
  }

  // SLA-enriched open tickets
  const openTickets = tickets
    .filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status))
    .map(t => ({ ...t, sla: calculateSLA(t) }))
    .sort((a, b) => (b.sla?.overall.percentage ?? 0) - (a.sla?.overall.percentage ?? 0))

  // Priority pie data
  const pieData = Object.entries(
    tickets.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {role === ROLES.USER ? 'My Tickets' : 'ITSM Dashboard'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {role === ROLES.USER
              ? 'Track your requests and incidents'
              : 'IT Service Management — Live operations view'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw}>
            Refresh
          </Button>
          <Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>
            New Ticket
          </Button>
        </div>
      </div>

      {/* ── P1 Alert Banner (Admin/Agent only) ── */}
      {isAgent && stats_computed.p1Active > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span style={{ color: 'var(--text-primary)' }}>
            <strong className="text-red-400">{stats_computed.p1Active} P1 Critical ticket{stats_computed.p1Active > 1 ? 's' : ''}</strong>
            {' '}require immediate attention
          </span>
          <Button
            size="sm" variant="danger"
            className="ml-auto flex-shrink-0"
            onClick={() => navigate('/itsm/tickets?priority=P1')}
          >
            View Now
          </Button>
        </div>
      )}

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Open Tickets"
          value={loading ? '—' : stats_computed.open}
          color="blue"
          icon={Ticket}
          sub="Across all priorities"
          trend={stats_computed.open > 5 ? { up: false, label: 'Action needed' } : { up: true, label: 'Under control' }}
          onClick={() => navigate('/itsm/tickets')}
        />
        <StatCard
          label="SLA Breached"
          value={loading ? '—' : stats_computed.breached}
          color={stats_computed.breached > 0 ? 'red' : 'green'}
          icon={Clock}
          sub={stats_computed.breached > 0 ? 'Needs immediate action' : 'All within SLA'}
          onClick={() => navigate('/itsm/sla')}
        />
        <StatCard
          label="Resolved Today"
          value={loading ? '—' : stats_computed.resolved}
          color="green"
          icon={CheckCircle}
          sub="Since midnight"
          trend={{ up: true, label: 'On target' }}
        />
        <StatCard
          label="P1 Critical"
          value={loading ? '—' : stats_computed.p1Active}
          color={stats_computed.p1Active > 0 ? 'red' : 'green'}
          icon={AlertTriangle}
          sub="Active critical incidents"
          onClick={() => navigate('/itsm/tickets?priority=P1')}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Ticket Queue (spans 2 cols) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* SLA Priority Queue */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isAgent ? 'SLA Priority Queue' : 'My Active Tickets'}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Sorted by SLA risk — {openTickets.length} active
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/itsm/tickets')}>
                View all
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : openTickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No open tickets"
                description={isAgent ? 'All tickets are resolved or closed.' : 'You have no active tickets.'}
                action={<Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>Raise Ticket</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="nd-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Priority</th>
                      <th>Status</th>
                      {isAgent && <th>Assignee</th>}
                      <th>SLA</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTickets.slice(0, 10).map(ticket => {
                      const sla = ticket.sla
                      const created = ticket.createdAt?.toDate?.()
                      return (
                        <tr
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/itsm/tickets/${ticket.id}`)}
                        >
                          <td>
                            <div className="font-mono text-[11px] text-blue-400 mb-0.5">{ticket.ticketId}</div>
                            <div className="text-[13px] font-medium max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>
                              {ticket.title}
                            </div>
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {ticket.category}
                            </div>
                          </td>
                          <td><PriorityBadge priority={ticket.priority} /></td>
                          <td><StatusBadge status={ticket.status} /></td>
                          {isAgent && (
                            <td>
                              <span className="text-[12px]" style={{ color: ticket.assigneeName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {ticket.assigneeName ?? 'Unassigned'}
                              </span>
                            </td>
                          )}
                          <td>
                            {sla ? (
                              <div className="min-w-[80px]">
                                <div className="flex items-center justify-between mb-1 text-[10px]">
                                  <SLABadge status={sla.resolution.status} />
                                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {sla.resolution.percentage}%
                                  </span>
                                </div>
                                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${sla.resolution.percentage}%`,
                                      background: sla.resolution.percentage >= 90 ? '#ef4444'
                                                : sla.resolution.percentage >= 70 ? '#f97316'
                                                : '#22c55e',
                                    }}
                                  />
                                </div>
                              </div>
                            ) : <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>}
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

          {/* Trend chart (admin/agent/manager) */}
          {(isAgent || role === ROLES.MANAGER) && (
            <Card>
              <CardHeader
                title="Ticket Volume Trend"
                subtitle="Last 7 days — Incidents vs Requests vs Resolved"
              />
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={TREND_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={color} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke={CHART_COLORS.incidents} fill={`url(#grad-incidents)`} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="requests"  name="Requests"  stroke={CHART_COLORS.requests}  fill={`url(#grad-requests)`}  strokeWidth={1.5} />
                  <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke={CHART_COLORS.resolved}  fill={`url(#grad-resolved)`}  strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Priority breakdown pie */}
          <Card>
            <CardHeader title="By Priority" subtitle="Active tickets" />
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[d.name] }} />
                      <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                      <span className="font-mono font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                No active tickets
              </div>
            )}
          </Card>

          {/* SLA Overview */}
          <Card>
            <CardHeader
              title="SLA Status"
              subtitle="Open tickets"
              actions={<Button variant="ghost" size="sm" onClick={() => navigate('/itsm/sla')}>Manage</Button>}
            />
            <div className="space-y-3">
              {openTickets.slice(0, 5).map(ticket => (
                <div key={ticket.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[11px] font-mono text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate(`/itsm/tickets/${ticket.id}`)}
                    >
                      {ticket.ticketId}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <SLABar sla={ticket.sla} compact />
                </div>
              ))}
              {openTickets.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No open tickets
                </p>
              )}
            </div>
          </Card>

          {/* AI Insight */}
          <AIInsight type={stats_computed.breached > 0 ? 'warning' : 'info'}>
            {stats_computed.breached > 0
              ? <><strong>{stats_computed.breached} ticket{stats_computed.breached > 1 ? 's have' : ' has'} breached SLA.</strong> Recommend immediate escalation to L2 team.</>
              : stats_computed.p1Active > 0
              ? <><strong>{stats_computed.p1Active} P1 critical</strong> ticket{stats_computed.p1Active > 1 ? 's are' : ' is'} active. Monitor resolution closely.</>
              : <>All tickets are within SLA thresholds. CSAT trending at <strong>94%</strong>.</>
            }
          </AIInsight>

          {/* Quick actions for users */}
          {role === ROLES.USER && (
            <Card>
              <CardHeader title="Quick Actions" />
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  icon={Plus}
                  onClick={() => navigate('/itsm/tickets/new')}
                >
                  Raise New Ticket
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  icon={Ticket}
                  onClick={() => navigate('/itsm/catalog')}
                >
                  Browse Service Catalog
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  icon={Activity}
                  onClick={() => navigate('/itsm/knowledge')}
                >
                  Search Knowledge Base
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
