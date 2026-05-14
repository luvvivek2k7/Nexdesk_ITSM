// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — ITAM Dashboard (Phase 2)
// IT Asset Management: inventory, CMDB, lifecycle, compliance
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { Plus, RefreshCw, AlertTriangle, CheckCircle, Monitor, Server } from 'lucide-react'
import { db, collection, getDocs, addDoc, serverTimestamp } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import {
  Card, CardHeader, StatCard, Badge, Button, AIInsight, EmptyState,
} from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const ASSET_TYPES    = ['Laptop','Desktop','Server','Mobile','Network','Cloud','Printer','Other']
const LIFECYCLE      = ['Procurement','Active','Maintenance','Retiring','Disposed']
const PIE_COLORS     = ['#3b62f5','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#6b7280']

const SAMPLE_ASSETS = [
  { id:'AST-001', name:'HP EliteBook 850 G9',  type:'Laptop',  status:'Active',    user:'Ananya Sharma',  dept:'Marketing',  warranty:'2026-03', compliance:true  },
  { id:'AST-002', name:'Dell PowerEdge R750',   type:'Server',  status:'Active',    user:'IT Dept',         dept:'IT Ops',     warranty:'2025-08', compliance:true  },
  { id:'AST-003', name:'Cisco Catalyst 9300',   type:'Network', status:'Active',    user:'Network Team',    dept:'IT Ops',     warranty:'2024-12', compliance:false },
  { id:'AST-004', name:'iPhone 14 Pro',          type:'Mobile',  status:'Active',    user:'Ravi Kumar',     dept:'IT',         warranty:'2025-06', compliance:true  },
  { id:'AST-005', name:'HP LaserJet M528f',      type:'Printer', status:'Retiring',  user:'Finance Fl 3',   dept:'Finance',    warranty:'2024-03', compliance:false },
  { id:'AST-006', name:'MacBook Pro M3',         type:'Laptop',  status:'Active',    user:'Developer 1',    dept:'Engineering',warranty:'2027-01', compliance:true  },
  { id:'AST-007', name:'Dell Optiplex 7090',     type:'Desktop', status:'Active',    user:'Meera Pillai',   dept:'Finance',    warranty:'2025-11', compliance:true  },
  { id:'AST-008', name:'Azure VM — prod-web-01', type:'Cloud',   status:'Active',    user:'DevOps',         dept:'Engineering',warranty:'N/A',     compliance:true  },
]

export default function ITAMDashboard() {
  const navigate = useNavigate()
  const { isAdmin, isAgent } = useAuth()
  const [assets,  setAssets]  = useState(SAMPLE_ASSETS)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

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
                        <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{a.dept}</div>
                      </td>
                      <td><Badge variant="blue" className="text-[10px]">{a.type}</Badge></td>
                      <td>
                        <Badge variant={a.status==='Active'?'green':a.status==='Retiring'?'amber':'default'} className="text-[10px]">
                          {a.status}
                        </Badge>
                      </td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{a.user}</span></td>
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
    </div>
  )
}
