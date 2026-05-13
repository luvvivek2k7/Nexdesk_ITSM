// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — ITAM Dashboard
// Asset overview: KPIs, type breakdown, expiry alerts, recent activity
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Package, AlertTriangle, TrendingUp, Plus, RefreshCw, DollarSign, Cpu } from 'lucide-react'
import { getAssetStats, listenToAssets } from '@/lib/assetService'
import { ASSET_TYPES, ASSET_STATUS } from '@/lib/constants'
import { Card, CardHeader, StatCard, Button, Badge, EmptyState } from '@/components/shared/index.jsx'
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

const PIE_COLORS = ['#3b62f5','#7c3aed','#06b6d4','#f59e0b','#ef4444','#22c55e','#f97316','#ec4899','#8b5cf6','#14b8a6','#f43f5e','#64748b']

function fmt(n) { return n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n}` }

export default function ITAMDashboard() {
  const navigate = useNavigate()
  const [stats,  setStats]  = useState(null)
  const [assets, setAssets] = useState([])
  const [loading,setLoading]= useState(true)

  useEffect(() => {
    getAssetStats().then(s => { setStats(s); setLoading(false) })
    const unsub = listenToAssets({}, setAssets)
    return unsub
  }, [])

  const typeData = stats ? Object.entries(stats.byType).map(([name, value]) => ({
    name: ASSET_TYPES[name]?.label ?? name, value,
  })) : []

  const statusData = stats ? Object.entries(stats.byStatus).map(([name, value]) => ({
    name: ASSET_STATUS[name]?.label ?? name, value,
  })) : []

  const expiring = assets.filter(a => {
    const d = a.warrantyEnd || a.expiryDate
    if (!d) return false
    const diff = new Date(d) - new Date()
    return diff > 0 && diff < 30 * 86400000
  })

  const recent = [...assets].sort((a,b) => {
    const ta = a.updatedAt?.toMillis?.() ?? 0
    const tb = b.updatedAt?.toMillis?.() ?? 0
    return tb - ta
  }).slice(0, 8)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ITAM Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>IT Asset Management — Lifecycle & inventory overview</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => getAssetStats().then(setStats)}>Refresh</Button>
          <Button size="sm" icon={Plus} onClick={() => navigate('/itam/assets/new')}>Add Asset</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Total Assets"  value={stats?.total ?? '—'}    icon={Monitor}      color="blue"   />
        <StatCard label="Active Assets" value={stats?.active ?? '—'}   icon={Cpu}          color="green"  />
        <StatCard label="Total Value"   value={stats ? fmt(stats.totalCost) : '—'} icon={DollarSign} color="violet" />
        <StatCard label="Expiring (30d)"value={stats?.expiringSoon ?? '—'} icon={AlertTriangle} color={stats?.expiringSoon > 0 ? 'red' : 'gray'} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardHeader title="Assets by Type" />
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No assets yet" description="Add your first asset to see breakdown" icon={Monitor} />}
        </Card>

        <Card>
          <CardHeader title="Assets by Status" />
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b62f5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No assets yet" description="Status breakdown will appear here" icon={Package} />}
        </Card>
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <Card>
          <CardHeader title={`⚠️ Expiring / Warranty Ending Soon (${expiring.length})`} />
          <div className="space-y-2">
            {expiring.map(a => {
              const d = new Date(a.warrantyEnd || a.expiryDate)
              const days = Math.ceil((d - new Date()) / 86400000)
              return (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]"
                  onClick={() => navigate(`/itam/assets/${a.id}`)}>
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{a.assetTag}</span>
                  </div>
                  <Badge variant={days <= 7 ? 'red' : 'amber'}>{days}d left</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Recent Assets */}
      <Card padding={false}>
        <div className="p-4 pb-0">
          <CardHeader title="Recent Assets" actions={<Button size="sm" variant="ghost" onClick={() => navigate('/itam/assets')}>View All</Button>} />
        </div>
        <div className="overflow-x-auto">
          <table className="nd-table">
            <thead>
              <tr><th>Asset Tag</th><th>Name</th><th>Type</th><th>Status</th><th>Assigned To</th><th>Location</th></tr>
            </thead>
            <tbody>
              {recent.length === 0
                ? <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No assets yet. Add your first asset.</td></tr>
                : recent.map(a => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/itam/assets/${a.id}`)}>
                    <td><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{a.assetTag}</code></td>
                    <td><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span></td>
                    <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ASSET_TYPES[a.type]?.label ?? a.type}</span></td>
                    <td><Badge variant={a.status === 'ACTIVE' ? 'green' : a.status === 'IN_REPAIR' ? 'amber' : a.status === 'DISPOSED' ? 'red' : 'gray'}>{ASSET_STATUS[a.status]?.label ?? a.status}</Badge></td>
                    <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.assignedName ?? '—'}</span></td>
                    <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.location || '—'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
