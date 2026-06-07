// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Visitor Management Dashboard (Phase 2)
// Premises & visitor: live roster, kiosk check-in, physical access, analytics
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { toast }    from 'react-hot-toast'
import {
  Building2, Users, Clock, AlertTriangle, CheckCircle,
  Plus, Search, Download, Shield, QrCode, Camera,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  Card, CardHeader, StatCard, Badge, Button, AIInsight,
} from '@/components/shared/index.jsx'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const VISITORS = [
  { id:'VIS-001', name:'Sarah Jones',    company:'TechCorp Ltd',    host:'Robert Smith', floor:'Fl 2 / Zone C', checkin:'09:15 AM', badge:'Active',  risk:'Low',    photo:'SJ' },
  { id:'VIS-002', name:'Danne Cwit',     company:'InfoSys Ltd',     host:'Robert Smith', floor:'Fl 2 / Zone C', checkin:'09:15 AM', badge:'Expired', risk:'Medium', photo:'DC' },
  { id:'VIS-003', name:'James L. Will',  company:'External Vendor', host:'James Lee',    floor:'Fl 3 / Zone A', checkin:'10:30 AM', badge:'Active',  risk:'High',   photo:'JW' },
  { id:'VIS-004', name:'Sarah Damen',    company:'AuditFirm Co.',   host:'Meera P.',     floor:'Fl 1 / Zone B', checkin:'11:00 AM', badge:'Active',  risk:'Low',    photo:'SD' },
  { id:'VIS-005', name:'Sautty Smith',   company:'Client ABC',      host:'Robert Smith', floor:'Fl 2 / Zone C', checkin:'11:20 AM', badge:'Active',  risk:'Low',    photo:'SS' },
  { id:'VIS-006', name:'Visitor ID 456', company:'Unknown',         host:'James Lee',    floor:'HQ / Zone D',   checkin:'14:00 PM', badge:'Active',  risk:'High',   photo:'VI' },
]

const TREND_DATA = [
  { time:'08:00', count:12 }, { time:'09:00', count:38 }, { time:'10:00', count:65 },
  { time:'11:00', count:98 }, { time:'12:00', count:88 }, { time:'13:00', count:72 },
  { time:'14:00', count:110 },{ time:'15:00', count:142 },
]

const FLOOR_DATA = [
  { floor:'Fl 1', count:45 }, { floor:'Fl 2', count:30 },
  { floor:'Fl 3', count:20 }, { floor:'HQ',   count:47 },
]

const TYPE_PIE = [
  { name:'Regular',  value:55, color:'#3b62f5' },
  { name:'Vendor',   value:28, color:'#f59e0b'  },
  { name:'Repeat',   value:12, color:'#22c55e'  },
  { name:'Flagged',  value:5,  color:'#ef4444'  },
]

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2.5 text-xs shadow-lg"
      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color ?? 'var(--accent)' }}>{p.name ?? 'Count'}: <span className="font-mono font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function VisitorDashboard() {
  const [tab,      setTab]     = useState('overview')
  const [visitors, setVisitors]= useState(VISITORS)
  const [search,   setSearch]  = useState('')

  const onsite  = visitors.length
  const flagged = visitors.filter(v => v.risk === 'High').length
  const expired = visitors.filter(v => v.badge === 'Expired').length

  const filtered = visitors.filter(v =>
    !search.trim() ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.company.toLowerCase().includes(search.toLowerCase()) ||
    v.host.toLowerCase().includes(search.toLowerCase())
  )

  const handlePreRegister = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('visitorName') || ''
    const newVisitor = {
      id: `VIS-${String(visitors.length + 1).padStart(3,'0')}`,
      name,
      company: fd.get('company') || '—',
      host:    fd.get('host')    || '—',
      floor:   fd.get('zone')   || 'Fl 1 / Zone A (Lobby)',
      checkin: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) + ' (Pre-Reg)',
      badge:   'Pre-Registered',
      risk:    'Low',
      photo:   name.trim().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'VX',
    }
    setVisitors(prev => [newVisitor, ...prev])
    setTab('roster')
    toast.success(`${name} pre-registered. QR invite sent to host.`)
    e.target.reset()
  }

  const handleDeactivate = (id) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, badge:'Expired' } : v))
    toast.success(`Badge deactivated for ${visitors.find(v=>v.id===id)?.name}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>
            Visitor Management
          </h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            Premises & physical access — live oversight · Phase 2
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" icon={AlertTriangle}
            onClick={() => toast('Emergency SMS broadcast sent to all hosts')}>
            Emergency SMS
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setTab('kiosk')}>
            Pre-Register
          </Button>
        </div>
      </div>

      {/* High-risk alert */}
      {flagged > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm flex-1" style={{ color:'var(--text-primary)' }}>
            <strong className="text-red-400">{flagged} high-risk visitor{flagged>1?'s':''}</strong> currently onsite — Visitor ID 456 unverified. Review immediately.
          </span>
          <Button size="sm" variant="danger">Review</Button>
        </div>
      )}

      {/* AI insights strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <AIInsight type="info">
          Visitor volume <strong>28% higher</strong> than average today. Peak expected at 15:00.
        </AIInsight>
        <AIInsight type="warning">
          <strong>{expired} visitor{expired>1?'s have':' has'} expired badges</strong> still on premises. Hosts not responding.
        </AIInsight>
        <AIInsight type="danger">
          One visitor previously flagged in compliance log. <strong>Recommend escort.</strong>
        </AIInsight>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Visitors Onsite"        value={onsite}  color="blue"  icon={Users}       sub="Live count" />
        <StatCard label="High-Risk / Flagged"    value={flagged} color="red"   icon={AlertTriangle} sub="Needs review" />
        <StatCard label="Expired Badges Onsite"  value={expired} color={expired>0?'amber':'green'} icon={Clock} sub="Auto-revoke pending" />
        <StatCard label="Today's Scheduled"      value="210"    color="cyan"  icon={Building2}   sub="Total booked" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
        {[['overview','Overview'],['roster','Live Roster'],['kiosk','Check-In Kiosk'],['access','Physical Access'],['analytics','Analytics']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: tab===k ? 'var(--accent)' : 'transparent',
              color: tab===k ? 'var(--accent)' : 'var(--text-muted)',
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Visitor trend */}
            <Card>
              <CardHeader title="Visitor Volume — Today" subtitle="Hourly count" />
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={TREND_DATA} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="time" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="count" name="Visitors" stroke="#3b62f5" strokeWidth={2} dot={{ r:3, fill:'#3b62f5' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Floor distribution */}
            <Card>
              <CardHeader title="Visitors by Floor / Zone" />
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={FLOOR_DATA} layout="vertical" margin={{ top:4, right:4, bottom:0, left:10 }}>
                  <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="floor" type="category" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="count" name="Visitors" fill="#3b62f5" radius={[0,3,3,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Visitor type pie */}
            <Card>
              <CardHeader title="Visitor Types" />
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={TYPE_PIE} cx="50%" cy="50%" innerRadius={35} outerRadius={58}
                    paddingAngle={3} dataKey="value">
                    {TYPE_PIE.map((e,i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => `${v} visitors`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {TYPE_PIE.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ background:d.color }} />
                    <span style={{ color:'var(--text-muted)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader title="Quick Actions" />
              <div className="space-y-2">
                {[
                  { label:'Pre-register Visitor', icon:Plus,     fn:() => setTab('kiosk')   },
                  { label:'Export Roster PDF',    icon:Download, fn:() => toast('Roster exported') },
                  { label:'Emergency SMS Blast',  icon:AlertTriangle, fn:() => toast('Emergency SMS sent') },
                  { label:'Revoke All Expired',   icon:Shield,   fn:() => { setVisitors(prev => prev.map(v => v.badge==='Expired' ? {...v, badge:'Revoked'} : v)); toast('Expired badges revoked') } },
                ].map(a => (
                  <Button key={a.label} variant="ghost" className="w-full justify-start" icon={a.icon} size="sm" onClick={a.fn}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── LIVE ROSTER ── */}
      {tab === 'roster' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)' }}>
            <Search size={13} style={{ color:'var(--text-muted)' }} />
            <input type="text" placeholder="Search visitor, company, host…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
              style={{ color:'var(--text-primary)' }} />
          </div>

          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom:'1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
                Live Occupancy — {filtered.length} visitors onsite
              </h3>
              <Button size="sm" variant="ghost" icon={Download} onClick={() => toast('Roster exported')}>Export</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="nd-table">
                <thead>
                  <tr><th>Visitor</th><th>Company</th><th>Host</th><th>Location</th><th>Check-In</th><th>Badge</th><th>Risk</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                            {v.photo}
                          </div>
                          <span className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{v.name}</span>
                        </div>
                      </td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{v.company}</span></td>
                      <td><span className="text-xs" style={{ color:'var(--text-secondary)' }}>{v.host}</span></td>
                      <td><Badge variant="default" className="text-[9px]">{v.floor}</Badge></td>
                      <td><span className="text-[11px] font-mono" style={{ color:'var(--text-muted)' }}>{v.checkin}</span></td>
                      <td>
                        <Badge variant={v.badge==='Active'?'green':v.badge==='Expired'?'red':'default'} className="text-[10px]">
                          {v.badge==='Active'?'✅':v.badge==='Expired'?'⚠️':'🚫'} {v.badge}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={v.risk==='High'?'red':v.risk==='Medium'?'amber':'green'} className="text-[10px]">
                          {v.risk}
                        </Badge>
                      </td>
                      <td>
                        {v.badge === 'Active' ? (
                          <Button size="sm" variant="danger" style={{ fontSize:10 }}
                            onClick={() => handleDeactivate(v.id)}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" style={{ fontSize:10 }}>Info</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── KIOSK CHECK-IN ── */}
      {tab === 'kiosk' && (
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardHeader
              title="🖥 Visitor Self-Service Check-In Kiosk"
              subtitle="FR-H2 — Multi-language · Face capture · NDA signing"
            />
            <div className="grid grid-cols-5 gap-2 items-start">
              {[
                { step:1, icon:'📱', title:'Scan QR',        sub:'Mobile / QR code',          done:false },
                { step:2, icon:'🪪', title:'ID Scan',         sub:'Aadhaar / Passport',        done:false },
                { step:3, icon:'📸', title:'Photo Capture',   sub:'Live face match',           done:false },
                { step:4, icon:'✍️', title:'NDA Signature',   sub:'Digital sign',              done:false },
                { step:5, icon:'✅', title:'Health Check',    sub:'Compliance declaration',    done:false },
              ].map((s, i) => (
                <div key={s.step} className="flex flex-col items-center gap-1 text-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1"
                    style={{ background:'var(--accent-subtle)', color:'var(--accent)', border:'1px solid var(--accent-border)' }}>
                    {s.step}
                  </div>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-[11px] font-semibold" style={{ color:'var(--text-primary)' }}>{s.title}</div>
                  <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{s.sub}</div>
                  {i < 4 && (
                    <div className="absolute" style={{ display:'none' }}>›</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4" style={{ borderTop:'1px solid var(--border-subtle)' }}>
              <AIInsight type="info">
                <strong>AI Kiosk Capabilities:</strong> Face match · Blacklist detection · Duplicate visitor detection · Suspicious behaviour flagging.
                Full kiosk hardware integration in Phase 2 Sprint 4.
              </AIInsight>
            </div>
          </Card>

          {/* Pre-register form */}
          <Card>
            <CardHeader title="Pre-Register New Visitor" subtitle="FR-H1 — Host employee portal" />
            <form onSubmit={handlePreRegister}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Visitor Name',  placeholder:'Sarah Jones',    name:'visitorName', required:true  },
                { label:'Company',       placeholder:'TechCorp Ltd',   name:'company',     required:false },
                { label:'Host Employee', placeholder:'Robert Smith',   name:'host',        required:true  },
                { label:'Purpose',       placeholder:'Client meeting', name:'purpose',     required:false },
              ].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>{f.label}{f.required && ' *'}</label>
                  <input name={f.name} required={f.required} className="nd-input text-sm" placeholder={f.placeholder} />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>Visit Date & Time</label>
                <input type="datetime-local" name="visitTime" className="nd-input text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>Access Zone</label>
                <select name="zone" className="nd-input text-sm">
                  <option>Fl 1 / Zone A (Lobby)</option>
                  <option>Fl 2 / Zone C (Meeting)</option>
                  <option>Fl 3 / Zone A (Finance)</option>
                  <option>HQ / Zone D (Executive)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button type="submit" className="flex-1">
                Register &amp; Send Invite
              </Button>
              <Button type="button" variant="ghost" onClick={() => setTab('overview')}>Cancel</Button>
            </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── PHYSICAL ACCESS ── */}
      {tab === 'access' && (
        <div className="space-y-4">
          <AIInsight type="info">
            <strong>PACS Integration (FR-H4):</strong> Physical Access Credential System integration with time-bound QR/NFC badges,
            door entry logs, and AI risk monitoring. Full PACS hardware integration in Phase 2 Sprint 4.
          </AIInsight>
          <Card>
            <CardHeader title="Badge Validity Monitor" subtitle="Active badges with expiry countdown" />
            <div className="space-y-2">
              {visitors.filter(v => v.badge === 'Active').map(v => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                    {v.photo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{v.name}</div>
                    <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{v.floor} · Checked in {v.checkin}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.risk==='High'?'red':v.risk==='Medium'?'amber':'green'} className="text-[9px]">{v.risk} Risk</Badge>
                    <div className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>2h 45m left</div>
                    <Button size="sm" variant="danger" style={{ fontSize:10 }} onClick={() => handleDeactivate(v.id)}>Revoke</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Daily Visitor Trend — This Week" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[
                {day:'Mon',count:180},{day:'Tue',count:210},{day:'Wed',count:165},
                {day:'Thu',count:220},{day:'Fri',count:195},{day:'Sat',count:45},{day:'Sun',count:20},
              ]} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Visitors" fill="#3b62f5" radius={[3,3,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="Key Metrics" />
            {[
              { label:'Average Visit Duration', value:'07:50 min', color:'var(--cyan)'  },
              { label:'No-Show Rate',            value:'38%',       color:'var(--amber)' },
              { label:'Repeat Visitor Rate',     value:'22%',       color:'var(--green)' },
              { label:'After-Hours Visits',      value:'+15% QoQ',  color:'var(--violet)'},
              { label:'Vendor Concentration',    value:'38%',       color:'var(--blue)'  },
              { label:'High-Risk Flagged',        value:'0.8%',      color:'var(--red)'   },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-2"
                style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color:'var(--text-muted)' }}>{m.label}</span>
                <span className="text-sm font-bold font-mono" style={{ color:m.color }}>{m.value}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
