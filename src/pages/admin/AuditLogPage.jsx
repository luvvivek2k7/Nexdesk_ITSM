// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Audit Log Page  (Sprint 1 — Real Firestore)
// Append-only log of all system actions. No edit, no delete.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Shield, Download, RefreshCw, Filter } from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/shared/index.jsx'
import {
  db, collection, query, where, orderBy, limit, onSnapshot,
} from '@/lib/firebase'

const MODULES = ['All','ITSM','ITAM','IAM','HRMS','FSO','Visitor','Admin','Auth','Workflow']

const MODULE_COLOR = {
  ITSM:'blue', ITAM:'cyan', IAM:'violet', HRMS:'green',
  FSO:'amber', Visitor:'orange', Admin:'red', Auth:'default',
  Workflow:'violet', System:'default',
}

function fmtTs(ts) {
  if (!ts) return '—'
  const d = ts.toDate?.() ?? new Date(ts)
  return d.toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
  })
}

export default function AuditLogPage() {
  const { orgId, isSuper } = useAuth()
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [module,  setModule]  = useState('All')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    const constraints = []
    if (!isSuper) constraints.push(where('orgId', '==', orgId))
    if (module !== 'All') constraints.push(where('module', '==', module))
    constraints.push(orderBy('timestamp', 'desc'), limit(300))

    const unsub = onSnapshot(
      query(collection(db, 'audit_logs'), ...constraints),
      snap => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      err  => { console.warn('Audit log:', err.message); setLoading(false) }
    )
    return unsub
  }, [orgId, module, isSuper])

  const filtered = logs.filter(l =>
    !search.trim() ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor?.toLowerCase().includes(search.toLowerCase()) ||
    l.target?.toLowerCase().includes(search.toLowerCase())
  )

  const exportCSV = () => {
    const rows = [['Timestamp','Actor','Role','Action','Module','Target','Result']]
    filtered.forEach(l => rows.push([
      fmtTs(l.timestamp), l.actor, l.actorRole, l.action, l.module, l.target ?? '', l.result,
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a   = document.createElement('a')
    a.href    = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download= `nexdesk-audit-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>Audit Log</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            Immutable record of all system actions · Last 300 entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={Download} onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="nd-input text-xs"
          style={{ maxWidth: 240 }}
          placeholder="Search actor, action, target…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="nd-input text-xs"
          style={{ maxWidth: 150 }}
          value={module}
          onChange={e => setModule(e.target.value)}
        >
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', color:'var(--text-muted)' }}
        >
          <Shield size={12} />
          Append-only · No edit or delete permitted
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No audit logs yet"
            subtitle="Actions across all modules will appear here automatically"
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Timestamp','Actor','Role','Action','Module','Target','Result'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider"
                      style={{ color:'var(--text-muted)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}
                    className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color:'var(--text-muted)' }}>
                      {fmtTs(l.timestamp)}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap" style={{ color:'var(--text-primary)' }}>
                      {l.actor ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="default">{l.actorRole ?? '—'}</Badge>
                    </td>
                    <td className="px-3 py-2" style={{ color:'var(--text-secondary)', maxWidth:280 }}>
                      {l.action}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={MODULE_COLOR[l.module] ?? 'default'}>{l.module}</Badge>
                    </td>
                    <td className="px-3 py-2" style={{ color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {l.target ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={l.result === 'success' ? 'green' : 'red'}>
                        {l.result ?? 'success'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>
        Showing {filtered.length} of {logs.length} entries · Audit logs are immutable and cannot be deleted
      </p>
    </div>
  )
}
