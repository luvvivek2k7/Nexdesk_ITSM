// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — FSO Dashboard (Phase 2)
// Field Service Operations: dispatch, work orders, live map, SLA tracking
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { toast }    from 'react-hot-toast'
import {
  MapPin, Wrench, Clock, CheckCircle, AlertTriangle,
  Plus, RefreshCw, TrendingUp, Navigation, Package,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLES }   from '@/lib/constants'
import {
  Card, CardHeader, StatCard, Badge, Button, AIInsight,
} from '@/components/shared/index.jsx'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const ENGINEERS = [
  { id:'ENG-001', name:'Arun K.',   skills:['Server','Network'], rating:4.8, status:'available', lat:11.01, lng:76.97, queue:3, dist:'1.2km' },
  { id:'ENG-002', name:'Raj M.',    skills:['Network'],           rating:4.5, status:'on_job',    lat:11.02, lng:76.95, queue:1, dist:'2.8km' },
  { id:'ENG-003', name:'Vijay S.',  skills:['Hardware'],          rating:4.7, status:'available', lat:10.99, lng:76.98, queue:2, dist:'0.9km' },
  { id:'ENG-004', name:'Kumar P.',  skills:['DB','Server'],       rating:4.3, status:'sla_risk',  lat:11.03, lng:76.96, queue:4, dist:'3.5km' },
  { id:'ENG-005', name:'Siva R.',   skills:['Cloud'],             rating:4.6, status:'on_job',    lat:11.00, lng:76.99, queue:2, dist:'1.8km' },
  { id:'ENG-006', name:'Pradeep T.',skills:['Hardware','Network'],rating:4.4, status:'available', lat:11.01, lng:76.93, queue:0, dist:'4.1km' },
]

const WORK_ORDERS = [
  { id:'WO-001', title:'Network switch replacement — Fl 3',  priority:'P1', status:'In Progress', engineer:'Arun K.',   sla:'45 min', cost:'₹4,850',   type:'INCIDENT'  },
  { id:'WO-002', title:'Server RAM upgrade — DataCenter',   priority:'P2', status:'Dispatched',  engineer:'Vijay S.',  sla:'2h 10m', cost:'₹12,500',  type:'MAINTENANCE'},
  { id:'WO-003', title:'Printer offline — Finance floor',    priority:'P3', status:'Pending',     engineer:'Unassigned',sla:'6h',     cost:'₹1,200',   type:'INCIDENT'  },
  { id:'WO-004', title:'Wi-Fi AP installation — HQ Lobby',  priority:'P3', status:'Scheduled',   engineer:'Raj M.',    sla:'Tomorrow',cost:'₹3,400',  type:'INSTALLATION'},
  { id:'WO-005', title:'Laptop screen repair — Marketing',  priority:'P4', status:'Completed',   engineer:'Kumar P.',  sla:'Done',   cost:'₹2,100',   type:'REPAIR'    },
  { id:'WO-006', title:'UPS battery replacement — Server Rm',priority:'P2',status:'In Progress', engineer:'Siva R.',   sla:'1h 20m', cost:'₹8,750',   type:'MAINTENANCE'},
]

const PERF_DATA = [
  { day:'Mon', dispatches:12, resolved:11 },
  { day:'Tue', dispatches:15, resolved:13 },
  { day:'Wed', dispatches:9,  resolved:9  },
  { day:'Thu', dispatches:18, resolved:16 },
  { day:'Fri', dispatches:14, resolved:12 },
]

const STATUS_COLOR = {
  available: { dot:'#22c55e', label:'Available', badge:'green'  },
  on_job:    { dot:'#f59e0b', label:'On Job',     badge:'amber'  },
  sla_risk:  { dot:'#ef4444', label:'SLA Risk',   badge:'red'    },
  traveling: { dot:'#3b62f5', label:'Traveling',  badge:'blue'   },
}

const WO_STATUS_COLOR = {
  'In Progress': 'amber', 'Dispatched':'blue', 'Pending':'default',
  'Scheduled':'cyan', 'Completed':'green', 'Cancelled':'red',
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2.5 text-xs shadow-lg"
      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color }}>{p.name}: <span className="font-mono font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function FSODashboard() {
  const { role } = useAuth()
  const isOps  = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER].includes(role)
  const isEng  = role === ROLES.FIELD_ENGINEER

  const [tab,      setTab]      = useState('command')
  const [orders,   setOrders]   = useState(WORK_ORDERS)
  const [selected, setSelected] = useState(null)

  const available  = ENGINEERS.filter(e => e.status === 'available').length
  const slaRisk    = WORK_ORDERS.filter(w => !['Completed','Cancelled'].includes(w.status) && w.priority !== 'P4').length
  const totalCost  = WORK_ORDERS.filter(w => w.status === 'Completed')
    .reduce((s, w) => s + parseInt(w.cost.replace(/[₹,]/g, '')), 0)

  const handleAssign = (woId, engName) => {
    setOrders(prev => prev.map(w =>
      w.id === woId ? { ...w, engineer:engName, status:'Dispatched' } : w
    ))
    toast.success(`${woId} assigned to ${engName}`)
    setSelected(null)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>
            FSO Command Center
          </h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            Field Service Operations — Live dispatch & work orders · Phase 2
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw}>Refresh</Button>
          <Button size="sm" icon={Plus} onClick={() => toast('Work order creation — Phase 2 sprint 2')}>
            New Work Order
          </Button>
        </div>
      </div>

      {/* SLA alert */}
      {ENGINEERS.some(e => e.status === 'sla_risk') && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm flex-1" style={{ color:'var(--text-primary)' }}>
            <strong className="text-red-400">Kumar P.</strong> is at SLA risk — 4 jobs in queue. Consider redistributing workload.
          </span>
          <Button size="sm" variant="danger">Redistribute</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Engineers Available" value={available}               color="green"  icon={Wrench}       sub={`of ${ENGINEERS.length} total`} />
        <StatCard label="Active Work Orders"  value={orders.filter(w=>w.status!=='Completed'&&w.status!=='Cancelled').length} color="blue" icon={Package} sub="Open dispatches" />
        <StatCard label="SLA Risk Dispatches" value={ENGINEERS.filter(e=>e.status==='sla_risk').length} color="red" icon={AlertTriangle} sub="Needs attention" />
        <StatCard label="Revenue Today"       value={`₹${(totalCost/1000).toFixed(1)}k`} color="cyan" icon={TrendingUp} sub="Completed orders" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
        {[['command','Command Center'],['workorders','Work Orders'],['engineers','Engineers'],['performance','Performance']].map(([k,l]) => (
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

      {/* ── COMMAND CENTER ── */}
      {tab === 'command' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Map simulation */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="🗺 Real-Time Technician Map" subtitle="Coimbatore region — live positions" />
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  height: 300,
                  background: 'linear-gradient(145deg,#0d1f12 0%,#0a1a20 50%,#0d1220 100%)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Grid overlay simulating a map */}
                <div style={{
                  position:'absolute', inset:0,
                  backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
                  backgroundSize:'40px 40px',
                }} />

                {/* City label */}
                <div style={{ position:'absolute', top:'45%', left:'42%', color:'rgba(255,255,255,0.12)', fontSize:18, fontWeight:700, letterSpacing:2 }}>
                  COIMBATORE
                </div>

                {/* Heat areas */}
                {[
                  { x:30, y:35, color:'rgba(239,68,68,0.15)',   size:80 },
                  { x:55, y:55, color:'rgba(245,158,11,0.12)',  size:60 },
                  { x:70, y:30, color:'rgba(59,98,245,0.1)',    size:50 },
                ].map((h,i) => (
                  <div key={i} style={{
                    position:'absolute', left:`${h.x}%`, top:`${h.y}%`,
                    width:h.size, height:h.size, borderRadius:'50%',
                    background:h.color, transform:'translate(-50%,-50%)',
                    filter:'blur(20px)',
                  }} />
                ))}

                {/* Engineer pins */}
                {ENGINEERS.map((eng, i) => {
                  const positions = [
                    {x:28,y:32},{x:55,y:22},{x:70,y:52},{x:42,y:62},{x:80,y:32},{x:20,y:58}
                  ]
                  const pos = positions[i]
                  const sc  = STATUS_COLOR[eng.status]
                  const isSel = selected?.id === eng.id
                  return (
                    <div
                      key={eng.id}
                      style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`, transform:'translate(-50%,-50%)', cursor:'pointer', zIndex: isSel ? 10 : 1 }}
                      onClick={() => setSelected(isSel ? null : eng)}
                    >
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        background:`linear-gradient(135deg,${sc.dot},${sc.dot}88)`,
                        border:`2px solid ${isSel ? '#fff' : '#0b1120'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700, color:'#fff',
                        boxShadow: isSel ? `0 0 0 4px ${sc.dot}44` : 'none',
                        transition:'all .15s',
                      }}>
                        {eng.name.charAt(0)}
                      </div>

                      {/* Tooltip on select */}
                      {isSel && (
                        <div style={{
                          position:'absolute', bottom:'calc(100% + 8px)', left:'50%',
                          transform:'translateX(-50%)', minWidth:150,
                          background:'rgba(0,0,0,0.92)', border:'1px solid rgba(255,255,255,0.12)',
                          borderRadius:8, padding:'8px 10px', fontSize:10, color:'#e2eaf5', zIndex:20,
                        }}>
                          <div style={{ fontWeight:700, marginBottom:3 }}>{eng.name}</div>
                          <div style={{ color:'#8fa3c8' }}>Skills: {eng.skills.join(', ')}</div>
                          <div style={{ color:'#8fa3c8' }}>Rating: ⭐ {eng.rating}</div>
                          <div style={{ color:'#8fa3c8' }}>Distance: {eng.dist}</div>
                          <div style={{ color:'#8fa3c8', marginBottom:5 }}>Queue: {eng.queue} jobs</div>
                          {eng.status === 'available' && (
                            <button
                              style={{ width:'100%', padding:'3px 0', borderRadius:4, background:'#3b62f5', color:'#fff', border:'none', cursor:'pointer', fontSize:10 }}
                              onClick={e => { e.stopPropagation(); toast(`Assigned nearest work order to ${eng.name}`) }}>
                              Auto-assign →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Legend */}
                <div style={{ position:'absolute', bottom:10, left:10, display:'flex', gap:10, fontSize:10 }}>
                  {Object.entries(STATUS_COLOR).map(([k,v]) => (
                    <span key={k} style={{ display:'flex', alignItems:'center', gap:4, color:'rgba(255,255,255,0.6)' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:v.dot, display:'inline-block' }} />
                      {v.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Engineer quick cards */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {ENGINEERS.map(eng => {
                  const sc = STATUS_COLOR[eng.status]
                  return (
                    <div key={eng.id}
                      className="rounded-lg p-2.5 flex items-center gap-2 cursor-pointer transition-all"
                      style={{
                        background: selected?.id === eng.id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                        border: `1px solid ${selected?.id === eng.id ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      }}
                      onClick={() => setSelected(selected?.id === eng.id ? null : eng)}
                    >
                      <div style={{ width:7, height:7, borderRadius:'50%', background:sc.dot, flexShrink:0 }} />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color:'var(--text-primary)' }}>{eng.name}</div>
                        <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>{eng.queue} jobs · ⭐{eng.rating}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Active work orders */}
            <Card>
              <CardHeader title="Active Work Orders" subtitle="Sorted by priority" />
              <div className="space-y-2">
                {orders.filter(w => !['Completed','Cancelled'].includes(w.status)).slice(0,5).map(wo => (
                  <div key={wo.id} className="rounded-lg p-2.5"
                    style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-blue-400">{wo.id}</span>
                      <Badge variant={WO_STATUS_COLOR[wo.status]} className="text-[9px]">{wo.status}</Badge>
                      <Badge variant={wo.priority==='P1'?'red':wo.priority==='P2'?'orange':'amber'} className="text-[9px] ml-auto">{wo.priority}</Badge>
                    </div>
                    <div className="text-[11px] font-medium mb-1 truncate" style={{ color:'var(--text-primary)' }}>
                      {wo.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color:'var(--text-muted)' }}>
                      <span>{wo.engineer}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={9} /> {wo.sla}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <AIInsight type={ENGINEERS.some(e=>e.status==='sla_risk') ? 'warning' : 'info'}>
              {ENGINEERS.some(e => e.status === 'sla_risk')
                ? <><strong>Kumar P.</strong> has 4 jobs queued and is at SLA risk. Recommend redistributing 2 jobs to Pradeep T. (0 queue).</>
                : <>Tomorrow's dispatch load exceeds capacity by <strong>18%</strong>. Consider scheduling an additional engineer.</>
              }
            </AIInsight>
          </div>
        </div>
      )}

      {/* ── WORK ORDERS ── */}
      {tab === 'workorders' && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom:'1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
              All Work Orders — {orders.length} total
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Engineer</th><th>SLA</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {orders.map(wo => (
                  <tr key={wo.id}>
                    <td><span className="font-mono text-[11px] text-blue-400">{wo.id}</span></td>
                    <td><span className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{wo.title}</span></td>
                    <td><Badge variant="default" className="text-[10px]">{wo.type}</Badge></td>
                    <td><Badge variant={wo.priority==='P1'?'red':wo.priority==='P2'?'orange':'amber'} className="text-[10px]">{wo.priority}</Badge></td>
                    <td><Badge variant={WO_STATUS_COLOR[wo.status]} className="text-[10px]">{wo.status}</Badge></td>
                    <td>
                      <span className="text-xs" style={{ color: wo.engineer==='Unassigned' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                        {wo.engineer}
                      </span>
                    </td>
                    <td><span className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{wo.sla}</span></td>
                    <td><span className="text-xs font-mono font-semibold" style={{ color:'var(--text-primary)' }}>{wo.cost}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── ENGINEERS ── */}
      {tab === 'engineers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENGINEERS.map(eng => {
            const sc = STATUS_COLOR[eng.status]
            return (
              <Card key={eng.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{eng.name}</span>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:sc.dot, flexShrink:0 }} />
                    </div>
                    <div className="text-[10px]" style={{ color:'var(--text-muted)' }}>
                      ⭐ {eng.rating} · {eng.dist} away
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {eng.skills.map(s => (
                    <Badge key={s} variant="blue" className="text-[9px]">{s}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg p-1.5" style={{ background:'var(--bg-elevated)' }}>
                    <div className="font-bold font-mono" style={{ color:'var(--text-primary)' }}>{eng.queue}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:10 }}>Jobs</div>
                  </div>
                  <div className="rounded-lg p-1.5" style={{ background:'var(--bg-elevated)' }}>
                    <div className="font-bold font-mono" style={{ color: sc.dot }}>{sc.label}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:10 }}>Status</div>
                  </div>
                  <div className="rounded-lg p-1.5" style={{ background:'var(--bg-elevated)' }}>
                    <div className="font-bold font-mono" style={{ color:'var(--text-primary)' }}>{eng.dist}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:10 }}>Distance</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── PERFORMANCE ── */}
      {tab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Dispatch Performance — This Week" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={PERF_DATA} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="dispatches" name="Dispatched" fill="#3b62f5" radius={[3,3,0,0]} opacity={0.85} />
                <Bar dataKey="resolved"   name="Resolved"   fill="#22c55e" radius={[3,3,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader title="Key Metrics" />
            {[
              { label:'SLA Miss Rate',         value:'3.43%', color:'var(--red)'   },
              { label:'First-Time Fix Rate',    value:'77.5%', color:'var(--green)' },
              { label:'Engineer Utilization',   value:'90%',   color:'var(--accent)'},
              { label:'Avg Job Duration',       value:'2.4h',  color:'var(--amber)' },
              { label:'Repeat Visit Rate',      value:'5.8%',  color:'var(--red)'   },
              { label:'Revenue per Dispatch',   value:'₹1.3K', color:'var(--cyan)'  },
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
