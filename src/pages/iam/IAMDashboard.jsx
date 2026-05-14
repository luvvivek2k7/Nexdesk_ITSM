// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — IAM Dashboard (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, Clock, CheckCircle, Users, Plus, X, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, StatCard, Badge, Button, AIInsight } from '@/components/shared/index.jsx'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'react-hot-toast'

const PENDING_REQUESTS = [
  { id:'AR-001', requester:'Alice Chen',    dept:'Finance',    app:'SAP Finance',    role:'Finance Executive', risk:78, sla:'3 days', status:'Pending',  aiRec:'Approve — peer-group standard' },
  { id:'AR-002', requester:'Kiran Mehta',  dept:'Engineering',app:'AWS Console',     role:'DevOps Engineer',   risk:45, sla:'2 days', status:'Pending',  aiRec:'Approve — matches job role'    },
  { id:'AR-003', requester:'Meera Pillai', dept:'Finance',    app:'SAP_GL & SAP_AP', role:'Finance + AP',      risk:92, sla:'1 day',  status:'Flagged',  aiRec:'⚠ SoD conflict detected'      },
  { id:'AR-004', requester:'Suresh Kumar', dept:'Operations', app:'Azure Portal',    role:'Contributor',       risk:55, sla:'3 days', status:'Pending',  aiRec:'Approve — standard ops access' },
  { id:'AR-005', requester:'Priya Nair',   dept:'IT',         app:'CrowdStrike',    role:'Security Analyst',  risk:30, sla:'4 days', status:'Approved', aiRec:'Already approved'              },
]

const RBAC_DATA = [
  { name:'RBAC', value:82, color:'#3b62f5' },
  { name:'Ad-hoc', value:18, color:'#f59e0b' },
]

export default function IAMDashboard() {
  const { isAdmin, isManager } = useAuth()
  const [requests, setRequests] = useState(PENDING_REQUESTS)
  const [tab, setTab] = useState('overview')

  const pending = requests.filter(r => r.status === 'Pending').length
  const flagged = requests.filter(r => r.status === 'Flagged').length

  const handleAction = (id, action) => {
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r
    ))
    toast.success(`Request ${id} ${action === 'approve' ? 'approved' : 'rejected'}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Identity & Access Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Access governance, SoD detection, approvals — Phase 2</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => toast('Access request form — Phase 2 sprint 2')}>Request Access</Button>
      </div>

      {flagged > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
            <strong className="text-red-400">{flagged} SoD conflict{flagged > 1 ? 's' : ''} detected</strong> — review before approving
          </span>
          <Button size="sm" variant="danger" onClick={() => setTab('approvals')}>Review Now</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Active Users"  value="24,500" color="blue"  icon={Users}         sub="Org-wide" />
        <StatCard label="Pending Requests"    value={pending} color="amber" icon={Clock}         sub="Awaiting approval" />
        <StatCard label="SoD Conflicts"       value={flagged} color={flagged > 0 ? 'red' : 'green'} icon={Shield} sub="High risk" />
        <StatCard label="Overdue Approvals"   value="42"     color="red"   icon={AlertTriangle}  sub="Past SLA" />
      </div>

      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {[['overview','Overview'],['approvals',`Approvals (${pending + flagged})`],['review','Access Review']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
            style={{ borderBottomColor: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? 'var(--accent)' : 'var(--text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="Risk & Compliance" />
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Org Risk Score</p>
                  <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--bg-hover)" strokeWidth="8"
                      strokeDasharray={`${2*Math.PI*30*0.75} ${2*Math.PI*30*0.25}`}
                      strokeDashoffset={2*Math.PI*30*0.125} strokeLinecap="round" transform="rotate(-90,40,40)" />
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#f59e0b" strokeWidth="8"
                      strokeDasharray={`${2*Math.PI*30*0.75*0.78} ${2*Math.PI*30*(1-0.75*0.78)}`}
                      strokeDashoffset={2*Math.PI*30*0.125} strokeLinecap="round" transform="rotate(-90,40,40)" />
                    <text x="40" y="44" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="700" fontFamily="monospace">78</text>
                  </svg>
                  <p className="text-[10px] text-amber-400 font-semibold mt-1">Amber / Medium</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>RBAC Coverage</p>
                  <ResponsiveContainer width="100%" height={70}>
                    <PieChart>
                      <Pie data={RBAC_DATA} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value">
                        {RBAC_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-2 text-[10px] mt-1">
                    {RBAC_DATA.map(s => (
                      <span key={s.name} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        <span style={{ color: 'var(--text-muted)' }}>{s.name} {s.value}%</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Orphan & Dormant</p>
                  <div className="flex justify-center gap-4 mt-3">
                    <div><p className="text-xl font-bold font-mono text-red-400">34</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Orphan</p></div>
                    <div><p className="text-xl font-bold font-mono text-amber-400">150</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dormant</p></div>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Temporary Access Tracker" subtitle="Expiring soon" />
              {[
                { project:'Project Phoenix',    ends:'5 days',  risk:'medium', user:'Kiran M.'   },
                { project:'Q3 Audit Access',    ends:'2 days',  risk:'high',   user:'Alice C.'   },
                { project:'Vendor Integration', ends:'10 days', risk:'low',    user:'Vendor ABC' },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.project}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.user}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.risk === 'high' ? 'red' : a.risk === 'medium' ? 'amber' : 'green'} className="text-[10px]">
                      Ends in {a.ends}
                    </Badge>
                    <Button size="sm" variant="ghost" style={{ fontSize: 10 }}>Extend</Button>
                    <Button size="sm" variant="danger" style={{ fontSize: 10 }}>Revoke</Button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
          <div className="space-y-4">
            <AIInsight type="warning">
              <strong>SoD Conflict:</strong> Meera Pillai has requested both SAP_GL and SAP_AP. This creates a Segregation of Duties risk.
              <strong> Recommend rejection</strong> or compensating control.
            </AIInsight>
            <Card>
              <CardHeader title="Quick Actions" />
              {[['Pending Approvals', pending, () => setTab('approvals')],
                ['SoD Violations', flagged, () => setTab('approvals')],
                ['Access Review', 11, () => setTab('review')],
                ['Dormant Accounts', 150, () => toast('Phase 2 sprint 2')]].map(([l, c, fn]) => (
                <button key={l} onClick={fn}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {l} <Badge variant={c > 0 ? 'red' : 'green'}>{c}</Badge>
                </button>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <Card padding={false}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Approval Queue — {pending + flagged} pending</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead><tr><th>Requester</th><th>Application / Role</th><th>Risk</th><th>AI Recommendation</th><th>SLA</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.requester}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.dept}</div>
                    </td>
                    <td>
                      <div className="text-xs" style={{ color: 'var(--text-primary)' }}>{r.app}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.role}</div>
                    </td>
                    <td>
                      <div className="w-8 h-5 rounded text-[10px] flex items-center justify-center font-bold text-white"
                        style={{ background: r.risk >= 80 ? '#ef4444' : r.risk >= 50 ? '#f59e0b' : '#22c55e' }}>
                        {r.risk}
                      </div>
                    </td>
                    <td><span className="text-[11px]" style={{ color: r.status === 'Flagged' ? 'var(--warning)' : 'var(--text-muted)' }}>{r.aiRec}</span></td>
                    <td><Badge variant="amber" className="text-[10px]">{r.sla}</Badge></td>
                    <td><Badge variant={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : r.status === 'Flagged' ? 'red' : 'amber'} className="text-[10px]">{r.status}</Badge></td>
                    <td>
                      {['Pending', 'Flagged'].includes(r.status) && (isAdmin || isManager) && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="success" style={{ fontSize: 10 }} onClick={() => handleAction(r.id, 'approve')}><Check size={10} /> Approve</Button>
                          <Button size="sm" variant="danger"  style={{ fontSize: 10 }} onClick={() => handleAction(r.id, 'reject')}><X size={10} /> Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'review' && (
        <AIInsight type="info">
          <strong>Access Review Campaign:</strong> Q3 Financial Apps Review — quarterly certification of user access.
          Full certification workflow coming in Phase 2 Sprint 3. Currently 11 certifications pending.
        </AIInsight>
      )}
    </div>
  )
}
