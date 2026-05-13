// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Asset List Page
// Searchable, filterable asset inventory with bulk actions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download, Monitor } from 'lucide-react'
import { listenToAssets } from '@/lib/assetService'
import { ASSET_TYPES, ASSET_STATUS } from '@/lib/constants'
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/shared/index.jsx'
import { useAuth } from '@/context/AuthContext'

export default function AssetListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [assets,  setAssets]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [typeFilter,   setTypeFilter]   = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    const unsub = listenToAssets({}, data => { setAssets(data); setLoading(false) }, () => setLoading(false))
    return unsub
  }, [])

  const filtered = useMemo(() => {
    let r = assets
    if (typeFilter   !== 'ALL') r = r.filter(a => a.type   === typeFilter)
    if (statusFilter !== 'ALL') r = r.filter(a => a.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.assetTag?.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        a.assignedName?.toLowerCase().includes(q) ||
        a.brand?.toLowerCase().includes(q)
      )
    }
    return r
  }, [assets, typeFilter, statusFilter, search])

  const exportCSV = () => {
    const rows = [['Asset Tag','Name','Type','Brand','Serial','Status','Assigned To','Location','Purchase Cost']]
    filtered.forEach(a => rows.push([a.assetTag, a.name, a.type, a.brand, a.serialNumber, a.status, a.assignedName ?? '', a.location ?? '', a.purchaseCost ?? '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a'); link.href = url; link.download = 'assets.csv'; link.click()
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Asset Inventory</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{assets.length} total assets</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={Download} onClick={exportCSV}>Export CSV</Button>
          {can('MANAGE_ITAM') && <Button size="sm" icon={Plus} onClick={() => navigate('/itam/assets/new')}>Add Asset</Button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1" style={{ color: 'var(--text-primary)' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="nd-input text-sm" style={{ width: 'auto' }}>
          <option value="ALL">All Types</option>
          {Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="nd-input text-sm" style={{ width: 'auto' }}>
          <option value="ALL">All Status</option>
          {Object.entries(ASSET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No assets found" description="Add your first asset or adjust filters" icon={Monitor}
            action={can('MANAGE_ITAM') ? { label: 'Add Asset', onClick: () => navigate('/itam/assets/new') } : null} />
        ) : (
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr><th>Asset Tag</th><th>Name</th><th>Type</th><th>Brand/Model</th><th>Status</th><th>Assigned To</th><th>Location</th><th>Warranty/Expiry</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const expDate = a.warrantyEnd || a.expiryDate
                  const expiring = expDate && (new Date(expDate) - new Date()) < 30 * 86400000 && new Date(expDate) > new Date()
                  return (
                    <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/itam/assets/${a.id}`)}>
                      <td><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{a.assetTag}</code></td>
                      <td><span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.name}</span></td>
                      <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ASSET_TYPES[a.type]?.icon} {ASSET_TYPES[a.type]?.label ?? a.type}</span></td>
                      <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</span></td>
                      <td><Badge variant={a.status === 'ACTIVE' ? 'green' : a.status === 'IN_REPAIR' ? 'amber' : a.status === 'DISPOSED' ? 'red' : 'gray'}>{ASSET_STATUS[a.status]?.label ?? a.status}</Badge></td>
                      <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.assignedName ?? <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</span></td>
                      <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.location || '—'}</span></td>
                      <td>{expDate ? <Badge variant={expiring ? 'amber' : 'gray'}>{expDate}</Badge> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}</td>
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
