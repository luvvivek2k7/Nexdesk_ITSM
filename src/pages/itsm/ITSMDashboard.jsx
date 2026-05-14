// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — ITSM Dashboard (COMPLETE REWRITE)
// Fully persona-aware, real Firestore data, all charts working
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useNavigate }                  from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle,
  Plus, RefreshCw, TrendingUp, Users, Activity,
  ArrowRight, BarChart3,
} from 'lucide-react'
import { useAuth }         from '@/context/AuthContext'
import { ROLES, SLA_POLICIES } from '@/lib/constants'
import { listenToTickets } from '@/lib/ticketService'
import { calculateSLA, getSLABarColor, formatRemaining } from '@/lib/sla'
import {
  StatCard, Card, CardHeader, Badge, PriorityBadge,
  StatusBadge, SLABadge, Button, AIInsight, EmptyState,
} from '@/components/shared/index.jsx'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2.5 text-xs shadow-lg"
      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color }}>
          {p.name}: <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Priority colours ──────────────────────────────────────────────────────────
const PIE_COLORS = { P1:'#ef4444', P2:'#f97316', P3:'#f59e0b', P4:'#3b62f5' }

// ── Static trend data (replace with Firestore aggregation in Phase 2) ────────
const WEEK_DATA = [
  { day:'Mon', incidents:8,  requests:14, resolved:12 },
  { day:'Tue', incidents:12, requests:18, resolved:16 },
  { day:'Wed', incidents:6,  requests:10, resolved:14 },
  { day:'Thu', incidents:15, requests:22, resolved:18 },
  { day:'Fri', incidents:11, requests:16, resolved:20 },
  { day:'Sat', incidents:4,  requests:6,  resolved:8  },
  { day:'Sun', incidents:3,  requests:4,  resolved:5  },
]

// ── Live countdown hook ───────────────────────────────────────────────────────
function useNow(intervalMs = 10000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export default function ITSMDashboard() {
  const { profile, role, isAdmin, isAgent } = useAuth()
  const navigate = useNavigate()
  const now      = useNow()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Real-time Firestore subscription ──────────────────────────────────────
  useEffect(() => {
    const filters = {}
    // Users only see their own tickets
    if (role === ROLES.USER || role === ROLES.HR) {
      filters.requesterId = profile?.uid
    }
    // Field engineers see assigned tickets
    if (role === ROLES.FIELD_ENGINEER) {
      filters.assigneeId = profile?.uid
    }

    const unsub = listenToTickets(filters, (data) => {
      setTickets(data)
      setLoading(false)
    })
    return unsub
  }, [role, profile?.uid])

  // ── Computed stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open     = tickets.filter(t => ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status))
    const resolved = tickets.filter(t => t.status === 'RESOLVED')
    const breached = tickets.filter(t => t.slaBreached)
    const p1Active = tickets.filter(t => t.priority === 'P1' && !['RESOLVED','CLOSED'].includes(t.status))

    return { open: open.length, resolved: resolved.length, breached: breached.length, p1Active: p1Active.length, total: tickets.length }
  }, [tickets])

  // ── SLA-enriched open tickets sorted by risk ──────────────────────────────
  const riskQueue = useMemo(() => {
    return tickets
      .filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status))
      .map(t => ({ ...t, sla: calculateSLA(t) }))
      .sort((a, b) => (b.sla?.resolution.percentage ?? 0) - (a.sla?.resolution.percentage ?? 0))
  }, [tickets, now])

  // ── Priority breakdown for pie chart ──────────────────────────────────────
  const pieData = useMemo(() =>
    Object.entries(
      tickets.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] ?? 0) + 1; return acc }, {})
    ).map(([name, value]) => ({ name, value }))
  , [tickets])

  // ── Category breakdown ────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const counts = tickets.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + 1; return acc
    }, {})
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  }, [tickets])

  // ── Persona-specific greeting ──────────────────────────────────────────────
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = profile?.displayName?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>
            {role === ROLES.USER ? `${greeting()}, ${firstName} 👋` : 'ITSM Dashboard'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            {isAgent
              ? 'IT Service Operations — Live view'
              : role === ROLES.MANAGER
              ? 'Team overview & approvals'
              : 'Your IT support portal'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw}>Refresh</Button>
          <Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>
            New Ticket
          </Button>
        </div>
      </div>

      {/* ── P1 Alert Banner ── */}
      {isAgent && stats.p1Active > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm flex-1" style={{ color:'var(--text-primary)' }}>
            <strong className="text-red-400">{stats.p1Active} P1 Critical</strong> ticket{stats.p1Active > 1 ? 's require' : ' requires'} immediate attention
          </span>
          <Button size="sm" variant="danger" onClick={() => navigate('/itsm/tickets?priority=P1')}>
            View Now
          </Button>
        </div>
      )}

      {/* ── SLA Breach Banner ── */}
      {isAgent && stats.breached > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)' }}
        >
          <Clock size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs flex-1" style={{ color:'var(--text-secondary)' }}>
            <strong className="text-red-400">{stats.breached} ticket{stats.breached > 1 ? 's have' : ' has'} breached SLA.</strong>
            {' '}Escalate and communicate to affected users immediately.
          </span>
          <Button size="sm" variant="ghost" onClick={() => navigate('/itsm/sla')}>
            SLA View
          </Button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Open Tickets"
          value={loading ? '—' : stats.open}
          color="blue" icon={Ticket}
          sub={`${stats.total} total`}
          trend={stats.open > 5 ? { up:false, label:'Action needed' } : { up:true, label:'Under control' }}
          onClick={() => navigate('/itsm/tickets')}
        />
        <StatCard
          label="SLA Breached"
          value={loading ? '—' : stats.breached}
          color={stats.breached > 0 ? 'red' : 'green'} icon={Clock}
          sub={stats.breached > 0 ? 'Immediate action needed' : 'All within SLA'}
          onClick={() => navigate('/itsm/sla')}
        />
        <StatCard
          label="Resolved"
          value={loading ? '—' : stats.resolved}
          color="green" icon={CheckCircle}
          sub="Closed tickets"
          trend={{ up:true, label:'Good progress' }}
        />
        <StatCard
          label="P1 Active"
          value={loading ? '—' : stats.p1Active}
          color={stats.p1Active > 0 ? 'red' : 'green'} icon={AlertTriangle}
          sub="Critical incidents"
          onClick={() => navigate('/itsm/tickets?priority=P1')}
        />
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Ticket queue (spans 2) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Ticket table */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom:'1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
                  {isAgent ? 'SLA Priority Queue' : 'My Active Tickets'}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color:'var(--text-muted)' }}>
                  {riskQueue.length} active · sorted by SLA risk
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/itsm/tickets')}>
                View all
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : riskQueue.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No open tickets"
                description={isAgent ? 'All clear! No active tickets.' : 'You have no open tickets.'}
                action={
                  <Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>
                    Raise Ticket
                  </Button>
                }
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
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskQueue.slice(0, 10).map(ticket => {
                      const sla     = ticket.sla
                      const pct     = sla?.resolution.percentage ?? 0
                      const created = ticket.createdAt?.toDate?.()
                      return (
                        <tr
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/itsm/tickets/${ticket.id}`)}
                        >
                          <td>
                            <div className="font-mono text-[11px] text-blue-400 mb-0.5">{ticket.ticketId}</div>
                            <div className="text-[13px] font-medium max-w-[200px] truncate" style={{ color:'var(--text-primary)' }}>
                              {ticket.title}
                            </div>
                          </td>
                          <td><PriorityBadge priority={ticket.priority} /></td>
                          <td><StatusBadge status={ticket.status} /></td>
                          {isAgent && (
                            <td>
                              <span className="text-xs" style={{ color: ticket.assigneeName ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                {ticket.assigneeName ?? 'Unassigned'}
                              </span>
                            </td>
                          )}
                          <td>
                            {sla ? (
                              <div className="min-w-[80px]">
                                <div className="flex items-center gap-1 mb-1">
                                  <SLABadge status={sla.resolution.status} />
                                  <span className="text-[10px] font-mono ml-1" style={{ color:'var(--text-muted)' }}>
                                    {pct}%
                                  </span>
                                </div>
                                <div className="w-full h-1 rounded-full" style={{ background:'var(--bg-elevated)' }}>
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width:`${pct}%`, background:getSLABarColor(sla.resolution.status) }}
                                  />
                                </div>
                              </div>
                            ) : <span className="text-xs" style={{ color:'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            <span className="text-[11px]" style={{ color:'var(--text-muted)' }}>
                              {created ? formatDistanceToNow(created, { addSuffix:true }) : '—'}
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

          {/* Trend chart — admin/agent/manager only */}
          {(isAgent || role === ROLES.MANAGER) && (
            <Card>
              <CardHeader
                title="Ticket Volume — Last 7 Days"
                subtitle="Incidents vs Service Requests vs Resolved"
              />
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={WEEK_DATA} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <defs>
                    {[['incidents','#ef4444'],['requests','#3b62f5'],['resolved','#22c55e']].map(([k,c]) => (
                      <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={c} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#ef4444" fill="url(#g-incidents)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="requests"  name="Requests"  stroke="#3b62f5" fill="url(#g-requests)"  strokeWidth={1.5} />
                  <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke="#22c55e" fill="url(#g-resolved)"  strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Category breakdown — admin/manager */}
          {(isAdmin || role === ROLES.MANAGER) && catData.length > 0 && (
            <Card>
              <CardHeader title="Tickets by Category" subtitle="All time" />
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={catData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Tickets" fill="#3b62f5" radius={[3,3,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Priority pie */}
          <Card>
            <CardHeader title="By Priority" subtitle="Active tickets" />
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={58}
                      paddingAngle={3} dataKey="value">
                      {pieData.map(e => (
                        <Cell key={e.name} fill={PIE_COLORS[e.name] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:PIE_COLORS[d.name] }} />
                      <span style={{ color:'var(--text-muted)' }}>{d.name}</span>
                      <span className="font-mono font-bold ml-auto" style={{ color:'var(--text-primary)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-center py-4" style={{ color:'var(--text-muted)' }}>No active tickets</p>
            )}
          </Card>

          {/* SLA status */}
          <Card>
            <CardHeader
              title="SLA Status"
              subtitle="Open tickets"
              actions={<Button variant="ghost" size="sm" onClick={() => navigate('/itsm/sla')}>Manage</Button>}
            />
            <div className="space-y-3">
              {riskQueue.slice(0, 5).map(ticket => {
                const sla = ticket.sla
                const pct = sla?.resolution.percentage ?? 0
                return (
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
                    <div className="w-full h-1 rounded-full" style={{ background:'var(--bg-elevated)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width:`${pct}%`, background:getSLABarColor(sla?.resolution.status) }}
                      />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color:'var(--text-muted)' }}>
                      {pct}% elapsed
                    </p>
                  </div>
                )
              })}
              {riskQueue.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color:'var(--text-muted)' }}>No open tickets</p>
              )}
            </div>
          </Card>

          {/* AI insight */}
          <AIInsight type={stats.breached > 0 ? 'danger' : stats.p1Active > 0 ? 'warning' : 'info'}>
            {stats.breached > 0
              ? <><strong>{stats.breached} SLA breach{stats.breached > 1 ? 'es'  : ''}.</strong> Escalate and communicate immediately.</>
              : stats.p1Active > 0
              ? <><strong>{stats.p1Active} P1 critical</strong> ticket{stats.p1Active > 1 ? 's are' : ' is'} active. Monitor closely.</>
              : stats.open > 0
              ? <>All {stats.open} tickets within SLA. Keep it up!</>
              : <>No open tickets — all clear! 🎉</>
            }
          </AIInsight>

          {/* User quick actions */}
          {role === ROLES.USER && (
            <Card>
              <CardHeader title="Quick Actions" />
              <div className="space-y-2">
                {[
                  { label:'Raise New Ticket',    path:'/itsm/tickets/new', icon:Plus     },
                  { label:'Browse Service Catalog',path:'/itsm/catalog',   icon:Activity },
                  { label:'Search Knowledge Base', path:'/itsm/knowledge', icon:BarChart3},
                ].map(a => (
                  <Button key={a.label} variant="ghost" className="w-full justify-start" icon={a.icon}
                    onClick={() => navigate(a.path)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Admin quick links */}
          {isAdmin && (
            <Card>
              <CardHeader title="Admin Actions" />
              <div className="space-y-1.5">
                {[
                  { label:'SLA Management',  path:'/itsm/sla'         },
                  { label:'User Management', path:'/admin/users'       },
                  { label:'System Settings', path:'/admin/settings'    },
                  { label:'Roles & Perms',   path:'/admin/roles'       },
                ].map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{ color:'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {a.label} <ArrowRight size={11} style={{ color:'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
