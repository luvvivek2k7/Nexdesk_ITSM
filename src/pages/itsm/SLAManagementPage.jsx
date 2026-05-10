// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — SLA Management Page
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { useAuth }          from '@/context/AuthContext'
import { listenToTickets }  from '@/lib/ticketService'
import { calculateSLA, getSLABarColor } from '@/lib/sla'
import { SLA_POLICIES }     from '@/lib/constants'
import {
  Card, CardHeader, StatCard, SLABadge, PriorityBadge,
  Toggle, AIInsight, Button,
} from '@/components/shared/index.jsx'

export default function SLAManagementPage() {
  const navigate  = useNavigate()
  const { isAdmin } = useAuth()
  const [tickets, setTickets]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [escalations, setEscalations] = useState({
    autoEscalateP1: true,
    notifyManagerOnBreach: true,
    autoAssignAtRisk: false,
    weekendPause: false,
    holidayAdjust: true,
  })

  useEffect(() => {
    const unsub = listenToTickets({}, data => { setTickets(data); setLoading(false) })
    return unsub
  }, [])

  const enriched = tickets
    .filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status))
    .map(t => ({ ...t, sla: calculateSLA(t) }))
    .sort((a, b) => (b.sla?.resolution.percentage ?? 0) - (a.sla?.resolution.percentage ?? 0))

  const breached = enriched.filter(t => t.sla?.resolution.breached)
  const atRisk   = enriched.filter(t => t.sla?.resolution.status === 'at_risk' && !t.sla?.resolution.breached)
  const onTrack  = enriched.filter(t => ['on_track','warning'].includes(t.sla?.resolution.status))

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>SLA Management</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Real-time SLA tracking across all active tickets
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Breached"   value={breached.length}  color="red"   icon={AlertTriangle} />
        <StatCard label="At Risk"    value={atRisk.length}    color="amber" icon={Clock} />
        <StatCard label="On Track"   value={onTrack.length}   color="green" icon={CheckCircle} />
        <StatCard label="Compliance" value={
          enriched.length > 0
            ? `${Math.round((onTrack.length / enriched.length) * 100)}%`
            : '—'
        } color="blue" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Active SLA timers */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Active SLA Timers
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Sorted by SLA risk — {enriched.length} open tickets
              </p>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : enriched.length === 0 ? (
              <div className="text-center py-12 text-xs" style={{ color: 'var(--text-muted)' }}>
                No active tickets — all clear!
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {enriched.map(ticket => {
                  const sla  = ticket.sla
                  const pct  = sla?.resolution.percentage ?? 0
                  const ms   = sla?.resolution.remainingMs ?? 0
                  const h    = Math.floor(Math.abs(ms) / 3600000)
                  const m    = Math.floor((Math.abs(ms) % 3600000) / 60000)
                  return (
                    <div
                      key={ticket.id}
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                      onClick={() => navigate(`/itsm/tickets/${ticket.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[11px] text-blue-400">{ticket.ticketId}</span>
                          <PriorityBadge priority={ticket.priority} />
                          {sla && <SLABadge status={sla.resolution.status} />}
                        </div>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {ticket.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: getSLABarColor(sla?.resolution.status) }}
                            />
                          </div>
                          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold font-mono ${
                          sla?.resolution.breached ? 'text-red-400' : ms < 3600000 ? 'text-amber-400' : 'text-green-400'
                        }`}>
                          {sla?.resolution.breached ? `+${h}h${m}m` : `${h}h${m}m`}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {sla?.resolution.breached ? 'overdue' : 'remaining'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Policy matrix */}
          <Card>
            <CardHeader title="SLA Policy Matrix" />
            <div className="space-y-3">
              {Object.entries(SLA_POLICIES).map(([key, policy]) => {
                const tix       = tickets.filter(t => t.priority === key && !['RESOLVED','CLOSED'].includes(t.status))
                const breachedN = tix.filter(t => t.slaBreached).length
                const compliance = tix.length > 0 ? Math.round(((tix.length - breachedN) / tix.length) * 100) : 100
                return (
                  <div key={key} className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <PriorityBadge priority={key} />
                      <span className="text-[11px] font-mono font-bold" style={{ color: compliance === 100 ? 'var(--success)' : compliance < 70 ? 'var(--danger)' : 'var(--warning)' }}>
                        {compliance}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span>Response: {policy.responseMinutes >= 60 ? `${policy.responseMinutes/60}h` : `${policy.responseMinutes}m`}</span>
                      <span>Resolve: {policy.resolutionHours}h</span>
                      <span>Active: {tix.length}</span>
                      <span className="text-red-400">Breached: {breachedN}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Escalation rules (admin only) */}
          {isAdmin && (
            <Card>
              <CardHeader title="Escalation Rules" />
              <div>
                {[
                  { key: 'autoEscalateP1',       label: 'Auto-escalate P1 after 2h', desc: 'Notify L2 team automatically' },
                  { key: 'notifyManagerOnBreach', label: 'Notify manager on breach',  desc: 'Send email to team manager' },
                  { key: 'autoAssignAtRisk',      label: 'Auto-assign at risk',       desc: 'Route to available agent' },
                  { key: 'weekendPause',          label: 'Weekend SLA pause',         desc: 'Pause SLA on Sat/Sun' },
                  { key: 'holidayAdjust',         label: 'Holiday adjustment',        desc: 'Apply public holiday rules' },
                ].map(rule => (
                  <Toggle
                    key={rule.key}
                    label={rule.label}
                    description={rule.desc}
                    enabled={escalations[rule.key]}
                    onChange={val => setEscalations(p => ({ ...p, [rule.key]: val }))}
                  />
                ))}
              </div>
            </Card>
          )}

          <AIInsight type={breached.length > 0 ? 'danger' : atRisk.length > 0 ? 'warning' : 'success'}>
            {breached.length > 0
              ? <><strong>{breached.length} ticket{breached.length > 1 ? 's have' : ' has'} breached SLA.</strong> Escalate immediately and communicate to stakeholders.</>
              : atRisk.length > 0
              ? <><strong>{atRisk.length} ticket{atRisk.length > 1 ? 's are' : ' is'} at risk.</strong> Prioritise before breach occurs.</>
              : <>All tickets are within SLA thresholds. <strong>SLA compliance is healthy.</strong></>
            }
          </AIInsight>
        </div>
      </div>
    </div>
  )
}
