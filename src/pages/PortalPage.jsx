// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Portal Home Page
// Persona-aware landing: different views for admin, agent, manager, user
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle, Plus,
  ShoppingBag, BookOpen, ArrowRight, Bell, Users,
  BarChart3, Settings, Shield, Wrench, Home,
} from 'lucide-react'
import { useAuth }         from '@/context/AuthContext'
import { listenToTickets } from '@/lib/ticketService'
import { calculateSLA }    from '@/lib/sla'
import { ROLES, MODULES, ROLE_META } from '@/lib/constants'
import {
  Card, CardHeader, StatCard, Badge, PriorityBadge,
  StatusBadge, SLABadge, Button, AIInsight, EmptyState,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow } from 'date-fns'

// ── Module cards data ─────────────────────────────────────────────────────────
const MODULE_CARDS = [
  { id:'itsm',    label:'ITSM',           icon:'🎫', path:'/itsm',    color:'blue',   live:true,  desc:'Incidents, requests, SLA'      },
  { id:'itam',    label:'ITAM',           icon:'🖥',  path:'/itam',   color:'cyan',   live:true,  desc:'Assets, CMDB, lifecycle'       },
  { id:'reports', label:'Reports',        icon:'📊', path:'/reports', color:'green',  live:true,  desc:'Analytics, SLA trends, agents' },
  { id:'iam',     label:'IAM',            icon:'🔐', path:'/iam',     color:'violet', live:false, phase:3, desc:'Access governance, approvals'  },
  { id:'hrms',    label:'HRMS',           icon:'👥', path:'/hrms',    color:'green',  live:false, phase:3, desc:'People, onboarding, leave'     },
  { id:'fso',     label:'Field Services', icon:'🔧', path:'/fso',     color:'amber',  live:false, phase:3, desc:'Dispatch, work orders, map'    },
  { id:'visitor', label:'Visitor Mgmt',   icon:'🏢', path:'/visitor', color:'orange', live:false, phase:3, desc:'Premises, check-in, badges'    },
  { id:'chatbot', label:'Chatbot',        icon:'💬', path:'/chatbot', color:'pink',   live:false, phase:3, desc:'AI ticket creation, NLP'       },
]

// ── Recent activity item ──────────────────────────────────────────────────────
function ActivityItem({ ticket, onClick }) {
  const sla     = calculateSLA(ticket)
  const created = ticket.createdAt?.toDate?.()
  return (
    <div
      className="flex items-center gap-3 py-2.5 cursor-pointer group"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[11px] text-blue-400">{ticket.ticketId}</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-xs font-medium truncate group-hover:text-blue-400 transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {ticket.title}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <StatusBadge status={ticket.status} />
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {created ? formatDistanceToNow(created, { addSuffix: true }) : '—'}
        </span>
      </div>
    </div>
  )
}

// ── Announcement / notice card ────────────────────────────────────────────────
function NoticeCard({ title, body, type = 'info' }) {
  const colors = {
    info:    { bg: 'var(--accent-subtle)',  border: 'var(--accent-border)',          dot: 'var(--accent)'  },
    warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',          dot: 'var(--warning)' },
    success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',            dot: 'var(--success)' },
  }
  const c = colors[type] ?? colors.info
  return (
    <div className="rounded-xl p-3.5"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </div>
  )
}

// ── Main Portal Page ──────────────────────────────────────────────────────────
export default function PortalPage() {
  const navigate           = useNavigate()
  const { profile, role }  = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdmin  = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(role)
  const isAgent  = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT].includes(role)
  const isManager = role === ROLES.MANAGER

  useEffect(() => {
    if (!profile) return  // wait for profile before subscribing
    const filters = {}
    if (role === ROLES.USER) filters.requesterId = profile.uid ?? profile.id
    const unsub = listenToTickets(
      filters,
      (data) => { setTickets(data); setLoading(false) },
      (err)  => { console.error('Portal ticket listener:', err); setLoading(false) }
    )
    return unsub
  }, [role, profile?.uid, profile?.id])

  // Computed stats
  const open     = tickets.filter(t => ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status))
  const breached = tickets.filter(t => t.slaBreached)
  const resolved = tickets.filter(t => t.status === 'RESOLVED')

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = profile?.displayName?.split(' ')[0] ?? 'there'
  const roleMeta  = ROLE_META[role]

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Welcome hero ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(59,98,245,0.08) 0%, rgba(124,58,237,0.06) 100%)',
          border: '1px solid rgba(59,98,245,0.15)',
        }}
      >
        {/* Background orb */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />

        <div className="flex items-start justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {roleMeta && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  {roleMeta.label}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>

          {/* Quick stats for portal hero */}
          <div className="flex gap-3 flex-shrink-0">
            {[
              { label: 'Open',     value: open.length,     color: 'text-blue-400' },
              { label: 'Breached', value: breached.length, color: 'text-red-400'  },
              { label: 'Resolved', value: resolved.length, color: 'text-green-400'},
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className={`text-2xl font-bold font-mono ${s.color}`}>{loading ? '—' : s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── P1 Alert (admin/agent only) ── */}
      {isAgent && breached.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            <strong className="text-red-400">{breached.length} ticket{breached.length > 1 ? 's have' : ' has'} breached SLA.</strong>
            {' '}Immediate escalation required.
          </span>
          <Button size="sm" variant="danger" className="ml-auto flex-shrink-0"
            onClick={() => navigate('/itsm/sla')}>
            View SLA
          </Button>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Modules + quick actions ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Module grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                All Modules
              </h2>
              <Badge variant="default">{MODULE_CARDS.filter(m => m.live).length} live · {MODULE_CARDS.filter(m => !m.live).length} planned</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODULE_CARDS.map(mod => {
                const isLive = mod.live === true
                return (
                  <button
                    key={mod.id}
                    onClick={() => isLive ? navigate(mod.path) : null}
                    className={`rounded-xl p-3.5 text-left transition-all duration-150 group ${
                      isLive
                        ? 'hover:scale-[1.03] hover:shadow-lg cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    style={{
                      background:  'var(--bg-surface)',
                      border:      `1px solid ${isLive ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                    }}
                    onMouseEnter={e => isLive && (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    onMouseLeave={e => e.currentTarget.style.borderColor = isLive ? 'var(--border-default)' : 'var(--border-subtle)'}
                  >
                    <div className="text-2xl mb-2">{mod.icon}</div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {mod.label}
                    </div>
                    <div className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {mod.desc}
                    </div>
                    {!isLive && (
                      <div className="mt-1.5">
                        <Badge variant="default" className="text-[9px]">Phase {mod.phase}</Badge>
                      </div>
                    )}
                    {isLive && (
                      <div className="mt-1.5">
                        <Badge variant="green" className="text-[9px]">Live</Badge>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick actions for standard user */}
          {role === ROLES.USER && (
            <Card>
              <CardHeader title="Quick Actions" subtitle="What do you need help with?" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Plus,        label: 'Raise Ticket',       sub: 'Report an issue',      path: '/itsm/tickets/new', primary: true },
                  { icon: ShoppingBag, label: 'Service Catalog',    sub: 'Request IT services',  path: '/itsm/catalog'                    },
                  { icon: BookOpen,    label: 'Knowledge Base',     sub: 'Find answers yourself', path: '/itsm/knowledge'                  },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className={`rounded-xl p-4 text-left transition-all hover:scale-[1.02] ${a.primary ? '' : ''}`}
                    style={{
                      background: a.primary ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                      border:     `1px solid ${a.primary ? 'var(--accent-border)' : 'var(--border-default)'}`,
                    }}
                  >
                    <a.icon size={18} className={a.primary ? 'text-blue-400' : ''} style={{ color: a.primary ? undefined : 'var(--text-muted)', marginBottom: 8 }} />
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.sub}</div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent tickets */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isAgent ? 'Recent Activity' : 'My Recent Tickets'}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {tickets.slice(0,5).length} of {tickets.length} tickets
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/itsm/tickets')}>
                View all
              </Button>
            </div>
            <div className="px-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No tickets yet"
                  description={role === ROLES.USER ? 'Raise your first ticket to get started.' : 'No tickets in the system.'}
                  action={<Button size="sm" icon={Plus} onClick={() => navigate('/itsm/tickets/new')}>Raise Ticket</Button>}
                />
              ) : (
                <div>
                  {tickets.slice(0, 6).map(t => (
                    <ActivityItem
                      key={t.id}
                      ticket={t}
                      onClick={() => navigate(`/itsm/tickets/${t.id}`)}
                    />
                  ))}
                  {tickets.length > 6 && (
                    <button
                      onClick={() => navigate('/itsm/tickets')}
                      className="w-full py-2.5 text-xs text-center transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--accent)' }}
                    >
                      View all {tickets.length} tickets →
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">

          {/* Admin quick navigation */}
          {isAdmin && (
            <Card>
              <CardHeader title="Admin Quick Links" />
              <div className="space-y-1">
                {[
                  { icon: BarChart3, label: 'ITSM Dashboard',  path: '/itsm/dashboard'  },
                  { icon: Clock,     label: 'SLA Management',  path: '/itsm/sla'         },
                  { icon: Users,     label: 'User Management', path: '/admin/users'      },
                  { icon: Shield,    label: 'Roles & Perms',   path: '/admin/roles'      },
                  { icon: Settings,  label: 'System Settings', path: '/admin/settings'   },
                ].map(l => (
                  <button
                    key={l.path}
                    onClick={() => navigate(l.path)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <l.icon size={14} style={{ color: 'var(--text-muted)' }} />
                    {l.label}
                    <ArrowRight size={12} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Notices */}
          <Card>
            <CardHeader title="Announcements" />
            <div className="space-y-2">
              <NoticeCard
                type="info"
                title="NexDesk Phase 2 Live 🚀"
                body="ITSM and ITAM are fully operational. Reports & Analytics now live. Phase 3: IAM, HRMS, Field Services."
              />
              <NoticeCard
                type="success"
                title="Google Authentication Active"
                body="Sign in with your Google account. Role assignment managed by IT Admin."
              />
              {isAgent && (
                <NoticeCard
                  type="warning"
                  title="SLA Policy Reminder"
                  body="P1 incidents require response within 1 hour. Ensure tickets are assigned immediately."
                />
              )}
            </div>
          </Card>

          {/* AI Insight */}
          <AIInsight type={breached.length > 0 ? 'warning' : 'info'}>
            {role === ROLES.USER
              ? open.length > 0
                ? <>You have <strong>{open.length} open ticket{open.length > 1 ? 's' : ''}</strong>. Check status in My Tickets.</>
                : <>No open tickets! Use the Service Catalog to request IT help.</>
              : breached.length > 0
              ? <><strong>{breached.length} SLA breach{breached.length > 1 ? 'es' : ''}.</strong> Escalate and communicate to affected users.</>
              : <>All systems within SLA. <strong>Platform health is good.</strong></>
            }
          </AIInsight>

          {/* Service catalog teaser */}
          <Card>
            <CardHeader title="Popular Services" subtitle="Click to request" />
            <div className="space-y-1.5">
              {[
                { icon: '🔑', label: 'Password Reset',    sla: '30 min', path: '/itsm/catalog' },
                { icon: '🔐', label: 'VPN Access',        sla: '2 hrs',  path: '/itsm/catalog' },
                { icon: '💻', label: 'Laptop Request',    sla: '3 days', path: '/itsm/catalog' },
                { icon: '📦', label: 'Software Install',  sla: '4 hrs',  path: '/itsm/catalog' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => navigate(s.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="text-sm flex-1 text-left" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.sla}</span>
                </button>
              ))}
              <button
                onClick={() => navigate('/itsm/catalog')}
                className="w-full text-xs text-center py-1.5 transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                View full catalog →
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Re-export the NoticeCard component for use in other pages
export { NoticeCard }
