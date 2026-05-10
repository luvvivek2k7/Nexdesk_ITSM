// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Notifications Page
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, Ticket, CheckCircle, Settings, X } from 'lucide-react'
import { Card, Button, Badge } from '@/components/shared/index.jsx'
import { formatDistanceToNow } from 'date-fns'

const MOCK_NOTIFS = [
  { id:1, type:'sla_breach',    title:'SLA Breach — INC-20250508-001',      body:'Critical Server Outage ticket has breached SLA. Immediate action required.',     time: new Date(Date.now()-120000),  read:false, path:'/itsm/tickets' },
  { id:2, type:'sla_risk',      title:'SLA At Risk — INC-20250508-003',      body:'VPN access ticket is at 80% SLA elapsed. Resolve within 2 hours.',               time: new Date(Date.now()-600000),  read:false, path:'/itsm/sla'     },
  { id:3, type:'ticket_update', title:'Ticket Assigned to You',              body:'REQ-20250507-012 Software Installation has been assigned to your queue.',         time: new Date(Date.now()-3600000), read:false, path:'/itsm/tickets' },
  { id:4, type:'approval',      title:'Approval Required',                   body:'New Software Access request from Ananya Sharma awaiting your approval.',          time: new Date(Date.now()-7200000), read:true,  path:'/itsm/tickets' },
  { id:5, type:'resolved',      title:'Ticket Resolved — REQ-20250506-005', body:'Your password reset request has been resolved. Please verify and close.',         time: new Date(Date.now()-86400000),read:true,  path:'/itsm/tickets' },
  { id:6, type:'system',        title:'NexDesk Phase 1 Deployed',            body:'ITSM module is now live. Raise tickets, track SLA, and use the knowledge base.', time: new Date(Date.now()-172800000),read:true, path:'/portal'       },
]

const TYPE_META = {
  sla_breach:    { icon: AlertTriangle, color: 'red',    bg: 'rgba(239,68,68,0.1)'  },
  sla_risk:      { icon: Clock,         color: 'amber',  bg: 'rgba(245,158,11,0.1)' },
  ticket_update: { icon: Ticket,        color: 'blue',   bg: 'rgba(59,98,245,0.1)'  },
  approval:      { icon: CheckCircle,   color: 'violet', bg: 'rgba(124,58,237,0.1)' },
  resolved:      { icon: CheckCircle,   color: 'green',  bg: 'rgba(34,197,94,0.1)'  },
  system:        { icon: Bell,          color: 'gray',   bg: 'rgba(107,114,128,0.1)'},
}

const COLOR_MAP = {
  red:    'text-red-400', amber: 'text-amber-400', blue: 'text-blue-400',
  violet: 'text-violet-400', green: 'text-green-400', gray: 'text-gray-400',
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState(MOCK_NOTIFS)
  const [filter, setFilter] = useState('all')

  const unread    = notifs.filter(n => !n.read).length
  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs

  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })))
  const dismiss     = (id) => setNotifs(p => p.filter(n => n.id !== id))
  const markRead    = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {unread} unread of {notifs.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>
          <Button variant="ghost" size="sm" icon={Settings} onClick={() => navigate('/admin/settings')} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key:'all',    label:`All (${notifs.length})`    },
          { key:'unread', label:`Unread (${unread})`        },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={{
              background:   filter === f.key ? 'var(--accent-subtle)' : 'transparent',
              borderColor:  filter === f.key ? 'var(--accent-border)' : 'var(--border-default)',
              color:        filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            No notifications
          </div>
        ) : (
          displayed.map(notif => {
            const meta = TYPE_META[notif.type] ?? TYPE_META.system
            return (
              <div
                key={notif.id}
                className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  background:  notif.read ? 'var(--bg-surface)' : 'var(--bg-surface)',
                  border:      `1px solid ${notif.read ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                  boxShadow:   notif.read ? 'none' : '0 0 0 1px rgba(59,98,245,0.1)',
                }}
                onClick={() => { markRead(notif.id); navigate(notif.path) }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.bg }}
                >
                  <meta.icon size={15} className={COLOR_MAP[meta.color]} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-tight ${notif.read ? '' : ''}`}
                      style={{ color: 'var(--text-primary)' }}>
                      {notif.title}
                      {!notif.read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 ml-2 mb-0.5 align-middle" />
                      )}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(notif.id) }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {notif.body}
                  </p>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(notif.time, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
