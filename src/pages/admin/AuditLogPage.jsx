// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Audit Log Page
// Displays admin action history from Firestore (auditLogs collection)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { FileText, Search, RefreshCw, Shield, User, Settings, Trash2 } from 'lucide-react'
import { db, collection, getDocs, query, orderBy, limit } from '@/lib/firebase'
import { Card, Badge, Button, EmptyState, Spinner } from '@/components/shared/index.jsx'
import { formatDistanceToNow, format } from 'date-fns'

const ACTION_META = {
  create:    { color: 'green',  icon: '➕' },
  update:    { color: 'blue',   icon: '✏️'  },
  delete:    { color: 'red',    icon: '🗑️' },
  login:     { color: 'cyan',   icon: '🔑' },
  role_change:{ color: 'violet',icon: '🛡️' },
  settings:  { color: 'amber',  icon: '⚙️'  },
}

// Fallback mock entries shown when no Firestore data exists yet
const MOCK_LOGS = [
  { id:'1', action:'role_change', actor:'admin@nexdesk.com', target:'user@company.com', detail:'Role changed to IT Agent',        resource:'users',    at: new Date(Date.now() - 120000)   },
  { id:'2', action:'create',      actor:'admin@nexdesk.com', target:'WF-001',           detail:'Workflow "Auto-assign P1" created',resource:'workflows', at: new Date(Date.now() - 600000)   },
  { id:'3', action:'update',      actor:'admin@nexdesk.com', target:'SLA Policy',       detail:'P1 resolution changed to 4h',     resource:'settings',  at: new Date(Date.now() - 3600000)  },
  { id:'4', action:'delete',      actor:'admin@nexdesk.com', target:'GRP-Legacy-IT',    detail:'Assignment group deleted',         resource:'groups',    at: new Date(Date.now() - 7200000)  },
  { id:'5', action:'login',       actor:'agent@nexdesk.com', target:'—',               detail:'Signed in via Google OAuth',       resource:'auth',      at: new Date(Date.now() - 10800000) },
  { id:'6', action:'settings',    actor:'admin@nexdesk.com', target:'System Settings', detail:'Email notifications enabled',      resource:'settings',  at: new Date(Date.now() - 86400000) },
]

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const q   = query(collection(db, 'auditLogs'), orderBy('at', 'desc'), limit(200))
      const snap = await getDocs(q)
      if (snap.empty) {
        setLogs(MOCK_LOGS)
      } else {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data(), at: d.data().at?.toDate?.() ?? new Date() })))
      }
    } catch {
      // Firestore collection may not exist yet — show mock data
      setLogs(MOCK_LOGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const displayed = logs.filter(l => {
    const matchFilter = filter === 'ALL' || l.action === filter
    const matchSearch = !search.trim() ||
      l.actor?.toLowerCase().includes(search.toLowerCase()) ||
      l.detail?.toLowerCase().includes(search.toLowerCase()) ||
      l.target?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Audit Log</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Admin action history — {logs.length} entries
          </p>
        </div>
        <Button variant="ghost" icon={RefreshCw} size="sm" onClick={load}>Refresh</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by actor, action, resource…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', 'create', 'update', 'delete', 'role_change', 'login', 'settings'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                background:  filter === f ? 'var(--accent-subtle)' : 'transparent',
                borderColor: filter === f ? 'var(--accent-border)' : 'var(--border-default)',
                color:       filter === f ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit entries found"
            description="Admin actions will appear here once recorded."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(log => {
                  const meta = ACTION_META[log.action] ?? { color: 'default', icon: '📝' }
                  const date = log.at instanceof Date ? log.at : new Date(log.at)
                  return (
                    <tr key={log.id}>
                      <td>
                        <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {format(date, 'dd MMM HH:mm')}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {log.actor ?? '—'}
                        </span>
                      </td>
                      <td>
                        <Badge variant={meta.color} className="text-[10px]">
                          {meta.icon} {log.action?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                          {log.resource ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                          {log.detail ?? log.target ?? '—'}
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
