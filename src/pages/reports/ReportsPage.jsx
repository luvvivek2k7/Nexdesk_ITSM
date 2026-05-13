// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Reports & Analytics Page
// Real Firestore data: ticket trends, SLA compliance, agent performance, ITAM
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, Clock, Users, Download, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { getDocs, query, orderBy, limit, collection, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAssetStats } from '@/lib/assetService'
import { TICKET_STATUS, SLA_POLICIES, CATEGORIES } from '@/lib/constants'
import { Card, CardHeader, StatCard, Badge, Spinner } from '@/components/shared/index.jsx'
import { calculateSLA } from '@/lib/sla'
import { format, subDays, startOfDay } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

const COLORS = ['#3b62f5','#7c3aed','#06b6d4','#f59e0b','#ef4444','#22c55e','#f97316','#ec4899']
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs shadow-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

export default function ReportsPage() {
  const [tickets,    setTickets]    = useState([])
  const [assetStats, setAssetStats] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [range,      setRange]      = useState(30) // days

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(500)))
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      const as = await getAssetStats()
      setAssetStats(as)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Filter tickets to selected range
  const rangeStart = subDays(new Date(), range)
  const inRange = useMemo(() => tickets.filter(t => {
    const d = t.createdAt?.toDate?.() ?? new Date(t.createdAt ?? 0)
    return d >= rangeStart
  }), [tickets, range])

  // Trend: tickets per day for last 7 days
  const trendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      const label = format(d, 'EEE')
      const dayStart = startOfDay(d)
      const dayEnd   = new Date(dayStart.getTime() + 86400000)
      const dayTickets = tickets.filter(t => {
        const td = t.createdAt?.toDate?.() ?? new Date(t.createdAt ?? 0)
        return td >= dayStart && td < dayEnd
      })
      return {
        day: label,
        created:  dayTickets.length,
        resolved: dayTickets.filter(t => ['RESOLVED','CLOSED'].includes(t.status)).length,
        breached: dayTickets.filter(t => t.slaBreached).length,
      }
    })
    return days
  }, [tickets])

  // Category breakdown
  const byCategory = useMemo(() => {
    const acc = {}
    inRange.forEach(t => { acc[t.category] = (acc[t.category] ?? 0) + 1 })
    return Object.entries(acc).map(([cat, count]) => {
      const meta = CATEGORIES.find(c => c.id === cat)
      return { name: meta?.label ?? cat, value: count }
    }).sort((a,b) => b.value - a.value)
  }, [inRange])

  // Priority breakdown
  const byPriority = useMemo(() => {
    const acc = { P1: 0, P2: 0, P3: 0, P4: 0 }
    inRange.forEach(t => { if (acc[t.priority] !== undefined) acc[t.priority]++ })
    return Object.entries(acc).map(([p, v]) => ({ name: p, value: v, fill: { P1:'#ef4444', P2:'#f97316', P3:'#f59e0b', P4:'#3b62f5' }[p] }))
  }, [inRange])

  // SLA compliance
  const slaStats = useMemo(() => {
    const closed = inRange.filter(t => ['RESOLVED','CLOSED'].includes(t.status))
    const total  = closed.length
    const breached = closed.filter(t => t.slaBreached).length
    const compliance = total > 0 ? Math.round(((total - breached) / total) * 100) : 100
    return { total, breached, compliance }
  }, [inRange])

  // Agent performance
  const agentPerf = useMemo(() => {
    const acc = {}
    inRange.filter(t => t.assigneeId).forEach(t => {
      if (!acc[t.assigneeId]) acc[t.assigneeId] = { name: t.assigneeName ?? 'Unknown', assigned: 0, resolved: 0 }
      acc[t.assigneeId].assigned++
      if (['RESOLVED','CLOSED'].includes(t.status)) acc[t.assigneeId].resolved++
    })
    return Object.values(acc).sort((a,b) => b.assigned - a.assigned).slice(0, 8)
  }, [inRange])

  // Summary KPIs
  const kpi = useMemo(() => ({
    total:    inRange.length,
    open:     inRange.filter(t => ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status)).length,
    resolved: inRange.filter(t => ['RESOLVED','CLOSED'].includes(t.status)).length,
    breached: inRange.filter(t => t.slaBreached).length,
  }), [inRange])

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reports & Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Operational insights across ITSM and ITAM</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={e => setRange(Number(e.target.value))} className="nd-input text-sm" style={{ width: 'auto' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]"><RefreshCw size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Tickets Created"  value={kpi.total}    icon={BarChart3}     color="blue"   />
        <StatCard label="Resolved"          value={kpi.resolved} icon={CheckCircle}   color="green"  />
        <StatCard label="SLA Breached"      value={kpi.breached} icon={AlertTriangle} color={kpi.breached > 0 ? 'red' : 'gray'} />
        <StatCard label="SLA Compliance"    value={`${slaStats.compliance}%`} icon={TrendingUp} color={slaStats.compliance >= 90 ? 'green' : slaStats.compliance >= 75 ? 'amber' : 'red'} />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader title="Ticket Trend — Last 7 Days" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gCreated"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#3b62f5" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b62f5" stopOpacity={0}/></linearGradient>
              <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="created"  stroke="#3b62f5" fill="url(#gCreated)"  name="Created"  strokeWidth={2} />
            <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="url(#gResolved)" name="Resolved" strokeWidth={2} />
            <Bar dataKey="breached" fill="#ef4444" name="Breached" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Category + Priority */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardHeader title="By Category" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory.slice(0,6)} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tickets" radius={[0,4,4,0]}>
                {byCategory.slice(0,6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="By Priority" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {byPriority.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Performance */}
      {agentPerf.length > 0 && (
        <Card>
          <CardHeader title="Agent Performance" />
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead><tr><th>Agent</th><th>Assigned</th><th>Resolved</th><th>Resolution Rate</th></tr></thead>
              <tbody>
                {agentPerf.map((a, i) => {
                  const rate = a.assigned > 0 ? Math.round((a.resolved / a.assigned) * 100) : 0
                  return (
                    <tr key={i}>
                      <td><span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.name}</span></td>
                      <td>{a.assigned}</td>
                      <td>{a.resolved}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className="text-xs w-8 text-right" style={{ color: 'var(--text-muted)' }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ITAM Summary */}
      {assetStats && (
        <Card>
          <CardHeader title="ITAM Summary" />
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Assets', value: assetStats.total },
              { label: 'Active',       value: assetStats.active },
              { label: 'Assigned',     value: assetStats.assigned },
              { label: 'Expiring (30d)', value: assetStats.expiringSoon, alert: assetStats.expiringSoon > 0 },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-2xl font-bold" style={{ color: s.alert ? 'var(--color-red)' : 'var(--text-primary)' }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
