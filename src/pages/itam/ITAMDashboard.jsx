import { useState, useEffect } from 'react'
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  Card, CardHeader, StatCard, Badge, Button, AIInsight, EmptyState, Spinner,
} from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listenToAssets, createAsset, updateAsset } from '@/lib/assetService'

const ASSET_TYPES    = ['Laptop','Desktop','Server','Mobile','Network','Cloud','Printer','Other']
const LIFECYCLE      = ['Procurement','Active','Maintenance','Retiring','Disposed']
const PIE_COLORS     = ['#3b62f5','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#6b7280']

export default function ITAMDashboard() {
  const { isAdmin, isAgent, profile, orgId, audit } = useAuth()
  const [assets,  setAssets]  = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)

  // ── Real-time Firestore listener ─────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const unsub = listenToAssets(
      { orgId },
      data => { setAssets(data); setLoading(false) },
      err  => { console.warn('ITAM listen error:', err.message); setLoading(false) }
    )
    return unsub
  }, [orgId])

  // Summary stats
  const total      = assets.length
  const active     = assets.filter(a => a.status === 'Active').length
  const retiring   = assets.filter(a => a.status === 'Retiring').length
  const nonCompliant = assets.filter(a => !a.compliance).length
  const expiring   = assets.filter(a => {
    if (a.warranty === 'N/A') return false
    const d = new Date(a.warranty)
    return d < new Date(Date.now() + 30 * 86400000)
  }).length

  // Pie data by type
  const typeData = ASSET_TYPES
    .map(t => ({ name:t, value:assets.filter(a => a.type === t).length }))
    .filter(d => d.value > 0)

  // Lifecycle data
  const lcData = LIFECYCLE.map(l => ({
    name: l,
    value: assets.filter(a => a.status === l || (l === 'Active' && a.status === 'Active')).length,
  })).filter(d => d.value > 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>IT Asset Management</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            ITAM · CMDB · Lifecycle · Compliance — Phase 2
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw}>Refresh</Button>
          {isAdmin && <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Add Asset</Button>}
        </div>
      </div>

      {/* Priority Asset Action Center */}
      <Card>
        <CardHeader title="🎯 Priority Asset Action Center" />
        <div className="space-y-2">
          {nonCompliant > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-xs flex-1" style={{ color:'var(--text-primary)' }}>
                <strong className="text-red-400">{nonCompliant} assets</strong> are non-compliant — warranty expired or OS unsupported
              </span>
              <Button size="sm" variant="danger">Review</Button>
            </div>
          )}
          {expiring > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs flex-1" style={{ color:'var(--text-primary)' }}>
                <strong className="text-amber-400">{expiring} asset{expiring > 1 ? 's' : ''}</strong> with warranty expiring in the next 30 days
              </span>
              <Button size="sm" variant="amber">Plan Renewal</Button>
            </div>
          )}
          {retiring > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)' }}>
              <Monitor size={14} className="text-violet-400 flex-shrink-0" />
              <span className="text-xs flex-1" style={{ color:'var(--text-primary)' }}>
                <strong className="text-violet-400">{retiring} asset{retiring > 1 ? 's' : ''}</strong> in Retiring status — schedule disposal
              </span>
              <Button size="sm" variant="ghost">Schedule</Button>
            </div>
          )}
          {nonCompliant === 0 && expiring === 0 && retiring === 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
              <span className="text-xs" style={{ color:'var(--text-primary)' }}>
                All assets are compliant and within warranty. <strong className="text-green-400">Audit ready.</strong>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Assets"   value={total}        color="blue"   icon={Monitor} sub="All asset types" />
        <StatCard label="Active"         value={active}       color="green"  icon={CheckCircle} sub={`${Math.round(active/total*100)}% of fleet`} />
        <StatCard label="Retiring"       value={retiring}     color="amber"  icon={RefreshCw} sub="Needs planning" />
        <StatCard label="Non-Compliant"  value={nonCompliant} color={nonCompliant > 0 ? 'red' : 'green'} icon={AlertTriangle} sub="Warranty / OS issues" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Asset table */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom:'1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>Asset Inventory</h3>
              <span className="text-xs" style={{ color:'var(--text-muted)' }}>{assets.length} assets</span>
            </div>
            <div className="overflow-x-auto">
              <table className="nd-table">
                <thead>
                  <tr>
                    <th>Asset ID</th><th>Name</th><th>Type</th><th>Status</th><th>User</th><th>Warranty</th><th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td><span className="font-mono text-[11px] text-blue-400">{a.id}</span></td>
                      <td>
                        <div className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{a.name}</div>
                        <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{a.department || a.dept || '—'}</div>
                      </td>
                      <td><Badge variant="blue" className="text-[10px]">{a.type}</Badge></td>
                      <td>
                        <Badge variant={a.status==='Active'?'green':a.status==='Retiring'?'amber':'default'} className="text-[10px]">
                          {a.status}
                        </Badge>
                      </td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{a.assignedTo || a.user || '—'}</span></td>
                      <td>
                        <span className={`text-xs font-mono ${
                          a.warranty !== 'N/A' && new Date(a.warranty) < new Date(Date.now() + 30*86400000)
                            ? 'text-amber-400' : ''
                        }`} style={{ color: a.warranty === 'N/A' ? 'var(--text-muted)' : undefined }}>
                          {a.warranty}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold ${a.compliance ? 'text-green-400' : 'text-red-400'}`}>
                          {a.compliance ? '✅ Yes' : '❌ No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Charts */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Assets by Type" />
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={35} outerRadius={58}
                  paddingAngle={3} dataKey="value">
                  {typeData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {typeData.map((d,i) => (
                <div key={d.name} className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:PIE_COLORS[i%PIE_COLORS.length] }} />
                  <span style={{ color:'var(--text-muted)' }}>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifecycle Distribution" />
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={lcData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <XAxis dataKey="name" tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b62f5" radius={[3,3,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <AIInsight type={nonCompliant > 0 ? 'warning' : 'info'}>
            {nonCompliant > 0
              ? <><strong>{nonCompliant} non-compliant assets</strong> detected. Review warranty and OS support status before next audit.</>
              : <>Asset fleet is in good shape. Next warranty review recommended in 30 days for {expiring} assets.</>
            }
          </AIInsight>
        </div>
      </div>

      {/* ── Add Asset Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.7)' }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color:'var(--text-primary)' }}>Add New Asset</h2>
              <button onClick={() => setShowAdd(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)]"
                style={{ color:'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.target)
              const name = fd.get('name')?.trim()
              if (!name) { toast.error('Asset name is required'); return }
              setSaving(true)
              try {
                await createAsset({
                  name,
                  tag:        fd.get('tag')?.trim()     || '',
                  type:       fd.get('category')        || 'Other',
                  serial:     fd.get('serial')?.trim()  || '',
                  status:     'Active',
                  compliance: true,
                  assignedTo: fd.get('assignedTo')?.trim() || null,
                  location:   fd.get('location')?.trim()  || '',
                  warranty:   fd.get('warranty')           || 'N/A',
                  cost:       parseInt(fd.get('cost') || '0', 10),
                  orgId,
                }, profile)
                audit?.('asset_created', 'ITAM', name)
                toast.success(`Asset "${name}" added to CMDB`)
                setShowAdd(false)
                e.target.reset()
              } catch (err) {
                toast.error('Failed to save asset: ' + err.message)
              } finally {
                setSaving(false)
              }
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Asset Name *</label>
                  <input name="name" required className="nd-input w-full" placeholder="e.g. Dell Latitude 5540" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Asset Tag *</label>
                  <input name="tag" required className="nd-input w-full" placeholder="e.g. AST-0042" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Category</label>
                  <select name="category" className="nd-input w-full">
                    <option>Laptop</option><option>Desktop</option><option>Server</option>
                    <option>Network</option><option>Mobile</option><option>Peripheral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Assigned To</label>
                  <input name="assignedTo" className="nd-input w-full" placeholder="Employee name or Unassigned" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Serial Number</label>
                  <input name="serial" className="nd-input w-full" placeholder="Manufacturer serial" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Warranty Until</label>
                  <input name="warranty" type="date" className="nd-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Location</label>
                  <input name="location" className="nd-input w-full" placeholder="e.g. HQ Floor 2" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Purchase Cost (₹)</label>
                  <input name="cost" type="number" className="nd-input w-full" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ border:'1px solid var(--border-default)', color:'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: saving ? 'var(--bg-hover)' : 'var(--accent)' }}>
                  {saving ? 'Saving…' : 'Add to CMDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
