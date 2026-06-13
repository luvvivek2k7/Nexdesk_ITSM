// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Workflow Automation Page  (Sprint 1 — Firestore + smart dropdowns)
// Build trigger → condition → action chains. Executes on ticket/WO events.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight, Play,
  ChevronDown, ChevronRight, X, Save,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, Badge, Button, Spinner, EmptyState } from '@/components/shared/index.jsx'
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'
import { listenToUsers }          from '@/lib/userService'
import { listenToGroups }         from '@/lib/assignmentService'
import { toast } from 'react-hot-toast'

// ── Trigger definitions ───────────────────────────────────────────────────────
const TRIGGERS = [
  { value:'ticket.created',        label:'Ticket Created',               module:'ITSM'    },
  { value:'ticket.priority_p1',    label:'Ticket Created (P1 Critical)', module:'ITSM'    },
  { value:'ticket.assigned',       label:'Ticket Assigned',              module:'ITSM'    },
  { value:'ticket.resolved',       label:'Ticket Resolved',              module:'ITSM'    },
  { value:'ticket.sla_80',         label:'SLA 80% Consumed',             module:'ITSM'    },
  { value:'ticket.sla_breached',   label:'SLA Breached',                 module:'ITSM'    },
  { value:'ticket.unassigned_30m', label:'Ticket Unassigned > 30 min',   module:'ITSM'    },
  { value:'ticket.reopened',       label:'Ticket Re-opened',             module:'ITSM'    },
  { value:'asset.created',         label:'Asset Added to CMDB',          module:'ITAM'    },
  { value:'asset.checkout',        label:'Asset Checked Out',            module:'ITAM'    },
  { value:'wo.created',            label:'Work Order Created',           module:'FSO'     },
  { value:'wo.sla_risk',           label:'Work Order SLA at Risk',       module:'FSO'     },
  { value:'wo.completed',          label:'Work Order Completed',         module:'FSO'     },
  { value:'iam.request',           label:'Access Request Submitted',     module:'IAM'     },
  { value:'iam.approved',          label:'Access Request Approved',      module:'IAM'     },
  { value:'employee.created',      label:'Employee Added (Onboarding)',  module:'HRMS'    },
  { value:'visitor.checkin',       label:'Visitor Checked In',           module:'Visitor' },
]

// ── Action definitions — each has a type and required config fields ───────────
const ACTION_TYPES = [
  {
    value:'assign_agent',    label:'Assign to Agent',
    fields: [{ key:'agentId', label:'Agent', type:'user_select' }],
  },
  {
    value:'assign_group',    label:'Assign to Group',
    fields: [{ key:'groupId', label:'Group', type:'group_select' }],
  },
  {
    value:'set_priority',    label:'Set Priority',
    fields: [{ key:'priority', label:'Priority', type:'select',
               options:['P1 — Critical','P2 — High','P3 — Medium','P4 — Low'] }],
  },
  {
    value:'set_status',      label:'Set Status',
    fields: [{ key:'status', label:'Status', type:'select',
               options:['New','In Progress','Pending','Resolved','Closed','On Hold'] }],
  },
  {
    value:'send_email',      label:'Send Email Notification',
    fields: [
      { key:'recipient', label:'Recipient', type:'select', options:['Assignee','Requester','Manager','Group Lead','Custom'] },
      { key:'subject',   label:'Email Subject', type:'text', placeholder:'e.g. [NexDesk] Ticket {id} escalated' },
    ],
  },
  {
    value:'send_sms',        label:'Send SMS Alert',
    fields: [{ key:'recipient', label:'Recipient', type:'select', options:['Assignee','Manager','On-Call','Custom'] }],
  },
  {
    value:'escalate',        label:'Escalate Priority',
    fields: [{ key:'levels', label:'Escalate By', type:'select', options:['1 level','2 levels','To P1'] }],
  },
  {
    value:'add_note',        label:'Add Internal Note',
    fields: [{ key:'note', label:'Note Text', type:'text', placeholder:'Auto-generated note text…' }],
  },
  {
    value:'create_child',    label:'Create Child Ticket',
    fields: [
      { key:'title',   label:'Child Ticket Title',  type:'text',   placeholder:'e.g. Provision laptop for {requester}' },
      { key:'groupId', label:'Assign to Group',     type:'group_select' },
    ],
  },
  {
    value:'webhook',         label:'Call Webhook',
    fields: [{ key:'url', label:'Webhook URL', type:'text', placeholder:'https://hooks.example.com/…' }],
  },
]

// ── Condition operators ───────────────────────────────────────────────────────
const CONDITIONS = [
  { value:'priority_is',   label:'Priority is',        options:['P1','P2','P3','P4'] },
  { value:'dept_is',       label:'Department is',      options:['IT','Finance','Engineering','HR','Operations','Marketing'] },
  { value:'type_is',       label:'Ticket type is',     options:['Incident','Request','Change','Problem'] },
  { value:'tag_contains',  label:'Tag contains',       options:['vip','critical','hardware','software','network'] },
  { value:'always',        label:'Always (no filter)',  options:[] },
]

// ── Action config editor ──────────────────────────────────────────────────────
function ActionConfigEditor({ actionType, config, onChange, users, groups }) {
  const def = ACTION_TYPES.find(a => a.value === actionType)
  if (!def) return null
  return (
    <div className="mt-2 space-y-2 pl-3" style={{ borderLeft:'2px solid var(--border-subtle)' }}>
      {def.fields.map(field => (
        <div key={field.key}>
          <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-muted)' }}>{field.label}</label>
          {field.type === 'user_select' ? (
            <select className="nd-input text-xs w-full"
              value={config[field.key] ?? ''}
              onChange={e => onChange({ ...config, [field.key]: e.target.value,
                [`${field.key}Name`]: users.find(u => u.id === e.target.value)?.displayName ?? '' })}>
              <option value="">Select agent…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.department})</option>)}
            </select>
          ) : field.type === 'group_select' ? (
            <select className="nd-input text-xs w-full"
              value={config[field.key] ?? ''}
              onChange={e => onChange({ ...config, [field.key]: e.target.value,
                [`${field.key}Name`]: groups.find(g => g.id === e.target.value)?.name ?? '' })}>
              <option value="">Select group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.module})</option>)}
            </select>
          ) : field.type === 'select' ? (
            <select className="nd-input text-xs w-full"
              value={config[field.key] ?? ''}
              onChange={e => onChange({ ...config, [field.key]: e.target.value })}>
              <option value="">Select…</option>
              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input className="nd-input text-xs w-full"
              placeholder={field.placeholder ?? ''}
              value={config[field.key] ?? ''}
              onChange={e => onChange({ ...config, [field.key]: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Workflow row ──────────────────────────────────────────────────────────────
function WorkflowRow({ wf, onToggle, onDelete }) {
  const triggerLabel = TRIGGERS.find(t => t.value === wf.trigger)?.label ?? wf.trigger
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
      style={{ border:'1px solid var(--border-default)', background:'var(--bg-surface)' }}>
      {/* Status indicator */}
      <div className="mt-1 flex-shrink-0">
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: wf.active ? '#22c55e' : 'var(--text-muted)',
          boxShadow:  wf.active ? '0 0 6px #22c55e' : 'none',
        }} />
      </div>
      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{wf.name}</span>
          <Badge variant={wf.active ? 'green' : 'default'}>{wf.active ? 'Active' : 'Draft'}</Badge>
          <Badge variant="blue">{TRIGGERS.find(t => t.value === wf.trigger)?.module ?? 'ITSM'}</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color:'var(--text-muted)' }}>
          <Zap size={10} />
          <span>Trigger:</span>
          <span style={{ color:'var(--text-secondary)' }}>{triggerLabel}</span>
        </div>
        {/* Action chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(wf.actions ?? []).map((a, i) => {
            const def = ACTION_TYPES.find(t => t.value === a.type)
            const label = def
              ? def.label + (a.config?.agentName ? ` → ${a.config.agentName}`
                : a.config?.groupName ? ` → ${a.config.groupName}`
                : a.config?.priority  ? ` → ${a.config.priority}`
                : a.config?.status    ? ` → ${a.config.status}` : '')
              : a.type
            return (
              <span key={i} className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background:'var(--accent-subtle)', color:'var(--accent)', border:'1px solid rgba(59,98,245,0.2)' }}>
                {i + 1}. {label}
              </span>
            )
          })}
        </div>
        {wf.runCount > 0 && (
          <p className="text-xs mt-1.5" style={{ color:'var(--text-muted)' }}>
            Executed {wf.runCount} times
            {wf.lastRunAt && ` · Last: ${wf.lastRunAt?.toDate?.().toLocaleString('en-IN') ?? '—'}`}
          </p>
        )}
      </div>
      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0 mt-0.5">
        <button onClick={() => onToggle(wf)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', color: wf.active ? 'var(--amber)' : 'var(--green)' }}
          title={wf.active ? 'Pause workflow' : 'Activate workflow'}>
          {wf.active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
        </button>
        <button onClick={() => onDelete(wf)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', color:'var(--red)' }}>
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  )
}

// ── Workflow builder form ─────────────────────────────────────────────────────
function WorkflowForm({ orgId, profile, users, groups, onClose, onSaved }) {
  const [name,      setName]     = useState('')
  const [trigger,   setTrigger]  = useState('')
  const [condition, setCondition]= useState({ type:'always', value:'' })
  const [actions,   setActions]  = useState([{ type:'', config:{} }])
  const [active,    setActive]   = useState(true)
  const [saving,    setSaving]   = useState(false)

  const addAction    = () => setActions(p => [...p, { type:'', config:{} }])
  const removeAction = i  => setActions(p => p.filter((_,j) => j !== i))
  const setActionType= (i, val) => setActions(p => p.map((a,j) => j===i ? { type:val, config:{} } : a))
  const setActionConf= (i, cfg) => setActions(p => p.map((a,j) => j===i ? { ...a, config:cfg } : a))

  const condDef = CONDITIONS.find(c => c.value === condition.type)

  const handleSave = async () => {
    if (!name.trim())    { toast.error('Workflow name required'); return }
    if (!trigger)        { toast.error('Select a trigger'); return }
    const validActions = actions.filter(a => a.type)
    if (!validActions.length) { toast.error('Add at least one action'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, 'workflows'), {
        name:      name.trim(),
        orgId,
        trigger,
        condition,
        actions:   validActions,
        active,
        runCount:  0,
        lastRunAt: null,
        createdBy: profile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success(`Workflow "${name}" created`)
      onSaved()
    } catch (err) { toast.error('Save failed: ' + err.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-2xl p-6"
        style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', maxHeight:'92vh', overflowY:'auto' }}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color:'var(--text-primary)' }}>⚡ New Workflow</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'var(--bg-hover)', color:'var(--text-muted)' }}><X size={14}/></button>
        </div>

        {/* Name */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Workflow Name *</label>
          <input className="nd-input w-full" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. P1 Escalation Chain" />
        </div>

        {/* Trigger */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Trigger Event *</label>
          <select className="nd-input w-full" value={trigger} onChange={e => setTrigger(e.target.value)}>
            <option value="">Select trigger…</option>
            {['ITSM','ITAM','IAM','HRMS','FSO','Visitor'].map(mod => (
              <optgroup key={mod} label={mod}>
                {TRIGGERS.filter(t => t.module === mod).map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Condition (optional filter)</label>
          <div className="flex gap-2">
            <select className="nd-input text-xs flex-1"
              value={condition.type}
              onChange={e => setCondition({ type:e.target.value, value:'' })}>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {condDef?.options?.length > 0 && (
              <select className="nd-input text-xs flex-1"
                value={condition.value}
                onChange={e => setCondition(p => ({ ...p, value:e.target.value }))}>
                <option value="">Any</option>
                {condDef.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color:'var(--text-secondary)' }}>Actions *</label>
          <div className="space-y-3">
            {actions.map((action, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-5 text-center"
                    style={{ color:'var(--text-muted)' }}>{i + 1}.</span>
                  <select className="nd-input text-xs flex-1"
                    value={action.type}
                    onChange={e => setActionType(i, e.target.value)}>
                    <option value="">Select action…</option>
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {actions.length > 1 && (
                    <button onClick={() => removeAction(i)} style={{ color:'var(--red)' }}>
                      <X size={13}/>
                    </button>
                  )}
                </div>
                {action.type && (
                  <ActionConfigEditor
                    actionType={action.type}
                    config={action.config}
                    onChange={cfg => setActionConf(i, cfg)}
                    users={users}
                    groups={groups}
                  />
                )}
              </div>
            ))}
          </div>
          <button onClick={addAction}
            className="mt-2 text-xs font-medium flex items-center gap-1"
            style={{ color:'var(--accent)' }}>
            <Plus size={12}/> Add another action
          </button>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setActive(p => !p)}
            className="flex items-center gap-2 text-xs"
            style={{ color: active ? 'var(--green)' : 'var(--text-muted)' }}>
            {active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
            {active ? 'Active (will run immediately)' : 'Save as draft'}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm"
            style={{ border:'1px solid var(--border-default)', color:'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: saving ? 'var(--bg-hover)' : 'var(--accent)' }}>
            {saving ? 'Saving…' : '⚡ Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const { orgId, profile, can } = useAuth()
  const canManage = can('MANAGE_WORKFLOWS')

  const [workflows, setWorkflows] = useState([])
  const [users,     setUsers]     = useState([])
  const [groups,    setGroups]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

  // Load workflows
  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, 'workflows'), where('orgId','==', orgId), orderBy('createdAt','desc')),
      snap => { setWorkflows(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false) },
      err  => { console.warn('workflows:', err.message); setWorkflows([]); setLoading(false) }
    )
    return unsub
  }, [orgId])

  // Load users (agents) and groups for dropdowns
  useEffect(() => {
    if (!orgId) return
    const unsubU = listenToUsers(orgId, setUsers)
    const unsubG = listenToGroups(setGroups)
    return () => { unsubU(); unsubG() }
  }, [orgId])

  const handleToggle = async (wf) => {
    try {
      await updateDoc(doc(db, 'workflows', wf.id), {
        active: !wf.active, updatedAt: serverTimestamp(),
      })
      toast.success(`Workflow ${wf.active ? 'paused' : 'activated'}`)
    } catch (err) { toast.error('Failed: ' + err.message) }
  }

  const handleDelete = async (wf) => {
    if (!window.confirm(`Delete workflow "${wf.name}"?`)) return
    try {
      await deleteDoc(doc(db, 'workflows', wf.id))
      toast.success('Workflow deleted')
    } catch (err) { toast.error('Delete failed: ' + err.message) }
  }

  const active = workflows.filter(w => w.active).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>Workflow Automation</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            {workflows.length} workflows · {active} active
          </p>
        </div>
        {canManage && (
          <Button size="sm" icon={Plus} onClick={() => setShowForm(true)}>New Workflow</Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : workflows.length === 0 ? (
        <Card>
          <EmptyState
            icon="⚡"
            title="No workflows yet"
            subtitle="Create automation rules to trigger actions on ticket creation, SLA events, and more."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <WorkflowRow key={wf.id} wf={wf} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <WorkflowForm
          orgId={orgId}
          profile={profile}
          users={users}
          groups={groups}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
