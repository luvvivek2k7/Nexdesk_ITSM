// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — HRMS Dashboard (Phase 2)
// HR Management: employee directory, onboarding, leave, performance
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserPlus, Calendar, TrendingUp,
  Plus, Search, Download, Star, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/lib/constants'
import {
  Card, CardHeader, StatCard, Badge, Button, AIInsight, Input,
} from '@/components/shared/index.jsx'
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { toast } from 'react-hot-toast'

const EMPLOYEES = [
  { id:'EMP-001', name:'Ananya Sharma',   dept:'Marketing',   role:'Senior Manager',    status:'Active',    joinDate:'2020-03-15', manager:'Suresh Kumar',  enps:8  },
  { id:'EMP-002', name:'Ravi Kumar',      dept:'IT Ops',      role:'Lead Engineer',      status:'Active',    joinDate:'2019-07-01', manager:'Admin User',    enps:7  },
  { id:'EMP-003', name:'Priya Nair',      dept:'IT Support',  role:'Service Desk Agent', status:'Active',    joinDate:'2021-11-20', manager:'Ravi Kumar',    enps:9  },
  { id:'EMP-004', name:'Suresh Kumar',    dept:'Operations',  role:'Operations Director',status:'Active',    joinDate:'2017-05-10', manager:'Admin User',    enps:7  },
  { id:'EMP-005', name:'Meera Pillai',    dept:'Finance',     role:'Finance Analyst',    status:'On Leave',  joinDate:'2022-02-28', manager:'Suresh Kumar',  enps:6  },
  { id:'EMP-006', name:'Kiran Mehta',     dept:'Engineering', role:'Software Engineer',  status:'Active',    joinDate:'2023-01-09', manager:'Ravi Kumar',    enps:8  },
  { id:'EMP-007', name:'Alice Chen',      dept:'Finance',     role:'Finance Executive',  status:'Active',    joinDate:'2020-09-15', manager:'Suresh Kumar',  enps:7  },
  { id:'EMP-008', name:'Dev Patel',       dept:'Engineering', role:'DevOps Engineer',    status:'Probation', joinDate:'2024-11-01', manager:'Ravi Kumar',    enps:null },
]

const LEAVE_REQUESTS = [
  { emp:'Meera Pillai',  type:'Sick Leave',   from:'2025-05-08', to:'2025-05-12', days:3, status:'Approved' },
  { emp:'Kiran Mehta',   type:'Annual Leave', from:'2025-05-20', to:'2025-05-23', days:4, status:'Pending'  },
  { emp:'Alice Chen',    type:'Work from Home',from:'2025-05-14',to:'2025-05-14', days:1, status:'Approved' },
  { emp:'Dev Patel',     type:'Annual Leave', from:'2025-06-02', to:'2025-06-06', days:5, status:'Pending'  },
]

const HEADCOUNT_TREND = [
  { month:'Nov', count:41 }, { month:'Dec', count:42 }, { month:'Jan', count:43 },
  { month:'Feb', count:44 }, { month:'Mar', count:46 }, { month:'Apr', count:47 },
  { month:'May', count:48 },
]

const DEPT_DATA = [
  { dept:'Engineering', count:14 }, { dept:'IT Ops', count:8 }, { dept:'Finance', count:7 },
  { dept:'Marketing', count:6 }, { dept:'Operations', count:9 }, { dept:'HR', count:4 },
]

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2.5 text-xs shadow-lg"
      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color ?? 'var(--accent)' }}>
          {p.name}: <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function HRMSDashboard() {
  const { role } = useAuth()
  const isHR  = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.HR].includes(role)
  const isMgr = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.HR].includes(role)

  const [tab,       setTab]       = useState('overview')
  const [search,    setSearch]    = useState('')
  const [leaves,    setLeaves]    = useState(LEAVE_REQUESTS)
  const [employees, setEmployees] = useState(EMPLOYEES)
  const [showForm,  setShowForm]  = useState(false)

  const filtered = employees.filter(e =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const attritionRisk = employees.filter(e => e.enps !== null && e.enps < 7).length
  const onLeave       = employees.filter(e => e.status === 'On Leave').length
  const avgENPS       = Math.round(
    employees.filter(e => e.enps).reduce((s, e) => s + e.enps, 0) /
    (employees.filter(e => e.enps).length || 1)
  )

  const handleLeave = (idx, action) => {
    setLeaves(prev => prev.map((l, i) =>
      i === idx ? { ...l, status: action === 'approve' ? 'Approved' : 'Rejected' } : l
    ))
    toast.success(`Leave request ${action}d`)
  }

  const handleAddEmployee = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const emp = {
      id:       `EMP-${String(employees.length + 1).padStart(3,'0')}`,
      name:     fd.get('name'),
      dept:     fd.get('dept'),
      role:     fd.get('empRole'),
      status:   'Active',
      joinDate: fd.get('joinDate') || new Date().toISOString().slice(0,10),
      manager:  fd.get('manager') || '—',
      enps:     null,
    }
    setEmployees(prev => [...prev, emp])
    setShowForm(false)
    toast.success(`${emp.name} added to employee directory`)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>
            HR Management System
          </h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            People & HR operations — Phase 2
          </p>
        </div>
        <div className="flex gap-2">
          {isHR && <Button variant="ghost" size="sm" icon={Download}>Export</Button>}
          {isHR && <Button size="sm" icon={UserPlus} onClick={() => setShowForm(true)}>Add Employee</Button>}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.7)' }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color:'var(--text-primary)' }}>Add Employee</h2>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)]"
                style={{ color:'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Full Name *</label>
                <input name="name" required className="nd-input w-full" placeholder="e.g. Priya Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Department *</label>
                  <input name="dept" required className="nd-input w-full" placeholder="e.g. Engineering" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Designation *</label>
                  <input name="empRole" required className="nd-input w-full" placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Join Date</label>
                  <input name="joinDate" type="date" className="nd-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Reporting Manager</label>
                  <input name="manager" className="nd-input w-full" placeholder="Manager name" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ border:'1px solid var(--border-default)', color:'var(--text-secondary)' }}>Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background:'var(--accent)' }}>Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attrition risk alert */}
      {attritionRisk > 0 && isMgr && (
        <AIInsight type="warning">
          <strong>AI Insight:</strong> {attritionRisk} employee{attritionRisk > 1 ? 's' : ''} showing attrition risk signals (eNPS &lt; 7).
          Recommend 1:1 check-ins with <strong>Meera Pillai</strong> and <strong>Suresh Kumar</strong>.
        </AIInsight>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Employees"  value={EMPLOYEES.length} color="blue"  icon={Users}       sub="All departments"   />
        <StatCard label="On Leave Today"   value={onLeave}          color="amber" icon={Calendar}    sub="Approved leaves"   />
        <StatCard label="eNPS Score"       value={avgENPS}          color={avgENPS >= 8 ? 'green' : 'amber'} icon={Star} sub="Avg engagement"    />
        <StatCard label="Attrition Risk"   value={attritionRisk}    color={attritionRisk > 0 ? 'red' : 'green'} icon={AlertTriangle} sub="Low eNPS flag"  />
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
        {[['overview','Overview'],['directory','Directory'],['leave',`Leave (${leaves.filter(l=>l.status==='Pending').length} pending)`],['performance','Performance']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: tab === k ? 'var(--accent)' : 'transparent',
              color: tab === k ? 'var(--accent)' : 'var(--text-muted)',
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Headcount trend */}
            <Card>
              <CardHeader title="Headcount Trend" subtitle="Last 7 months" />
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={HEADCOUNT_TREND} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="count" name="Headcount" stroke="#3b62f5" strokeWidth={2} dot={{ r:3, fill:'#3b62f5' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* By department */}
            <Card>
              <CardHeader title="Headcount by Department" />
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={DEPT_DATA} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="dept" tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="count" name="Employees" fill="#22c55e" radius={[3,3,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Quick stats */}
            <Card>
              <CardHeader title="Org Health Metrics" />
              {[
                { label:'Attendance Rate',      val:94,   color:'var(--green)'  },
                { label:'Training Completion',  val:78,   color:'var(--accent)' },
                { label:'Goal Achievement',     val:82,   color:'var(--cyan)'   },
                { label:'Onboarding (30d)',      val:90,   color:'var(--violet)' },
              ].map(m => (
                <div key={m.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color:'var(--text-muted)' }}>{m.label}</span>
                    <span className="font-bold font-mono" style={{ color:m.color }}>{m.val}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background:'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full" style={{ width:`${m.val}%`, background:m.color }} />
                  </div>
                </div>
              ))}
            </Card>

            {/* Upcoming */}
            <Card>
              <CardHeader title="Upcoming Events" />
              <div className="space-y-2 text-xs" style={{ color:'var(--text-secondary)' }}>
                <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                  <span>Dev Patel probation review</span>
                  <Badge variant="amber">Jun 1</Badge>
                </div>
                <div className="flex justify-between py-1.5" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                  <span>Q2 performance reviews</span>
                  <Badge variant="blue">Jun 15</Badge>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Annual salary revision</span>
                  <Badge variant="green">Jul 1</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── DIRECTORY TAB ── */}
      {tab === 'directory' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)' }}>
            <Search size={13} style={{ color:'var(--text-muted)' }} />
            <input type="text" placeholder="Search by name, department, role…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
              style={{ color:'var(--text-primary)' }} />
          </div>

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="nd-table">
                <thead>
                  <tr><th>Employee</th><th>Department</th><th>Role</th><th>Manager</th><th>Status</th><th>eNPS</th><th>Since</th></tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                            {e.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{e.name}</div>
                            <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{e.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{e.dept}</span></td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{e.role}</span></td>
                      <td><span className="text-xs" style={{ color:'var(--text-muted)' }}>{e.manager}</span></td>
                      <td>
                        <Badge variant={e.status==='Active'?'green':e.status==='On Leave'?'amber':e.status==='Probation'?'violet':'default'} className="text-[10px]">
                          {e.status}
                        </Badge>
                      </td>
                      <td>
                        {e.enps != null ? (
                          <span className={`text-xs font-bold font-mono ${e.enps >= 8 ? 'text-green-400' : e.enps >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                            {e.enps}/10
                          </span>
                        ) : <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>N/A</span>}
                      </td>
                      <td><span className="text-[11px]" style={{ color:'var(--text-muted)' }}>{e.joinDate}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── LEAVE TAB ── */}
      {tab === 'leave' && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom:'1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
              Leave Requests — {leaves.filter(l => l.status === 'Pending').length} pending
            </h3>
            <Button size="sm" icon={Plus} onClick={() => {
              const from = prompt('Leave start date (YYYY-MM-DD):')
              const to   = prompt('Leave end date (YYYY-MM-DD):')
              const type = prompt('Leave type (Annual / Sick / Casual):') || 'Annual'
              if (from && to) {
                setLeaves(prev => [{
                  name: 'Current User', type, from, to,
                  days: Math.max(1, Math.round((new Date(to)-new Date(from))/(86400000))+1),
                  status:'Pending'
                }, ...prev])
                toast.success('Leave request submitted for approval')
              }
            }}>
              Apply Leave
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th>{isMgr && <th>Action</th>}</tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={i}>
                    <td><span className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{l.emp}</span></td>
                    <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{l.type}</span></td>
                    <td><span className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{l.from}</span></td>
                    <td><span className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{l.to}</span></td>
                    <td><span className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{l.days}d</span></td>
                    <td>
                      <Badge variant={l.status==='Approved'?'green':l.status==='Rejected'?'red':'amber'} className="text-[10px]">
                        {l.status}
                      </Badge>
                    </td>
                    {isMgr && (
                      <td>
                        {l.status === 'Pending' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="success" style={{ fontSize:10 }} onClick={() => handleLeave(i,'approve')}>Approve</Button>
                            <Button size="sm" variant="danger"  style={{ fontSize:10 }} onClick={() => handleLeave(i,'reject')}>Reject</Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {tab === 'performance' && (
        <AIInsight type="info">
          <strong>Performance Module:</strong> Full performance review cycles, goal tracking, 360° feedback, and compensation planning
          are coming in Phase 3. Currently tracking eNPS scores in the employee directory.
        </AIInsight>
      )}
    </div>
  )
}
