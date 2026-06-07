// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Workflow Management
// Define routing rules: auto-assign tickets by category/priority/keyword
// Stored in Firestore: workflows collection
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, ToggleLeft, ToggleRight, Zap, ChevronDown } from 'lucide-react'
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '@/lib/firebase'
import { CATEGORIES, TICKET_TYPES, ROLES } from '@/lib/constants'
import { Card, CardHeader, Button, Badge, EmptyState } from '@/components/shared/index.jsx'

const PRIORITIES = ['P1','P2','P3','P4']
const ACTIONS_META = [
  { id: 'assign_to_user',  label: 'Assign to Agent',    hasTarget: true,  targetLabel: 'Agent Name' },
  { id: 'set_priority',    label: 'Set Priority',        hasTarget: true,  targetLabel: 'Priority', options: PRIORITIES },
  { id: 'add_tag',         label: 'Add Tag',             hasTarget: true,  targetLabel: 'Tag name'  },
  { id: 'send_email',      label: 'Send Email Alert',    hasTarget: true,  targetLabel: 'Email address' },
  { id: 'escalate',        label: 'Auto Escalate',       hasTarget: false  },
  { id: 'notify_manager',  label: 'Notify Manager',      hasTarget: false  },
]

const EMPTY_WF = {
  name: '', active: true,
  conditions: { type: '', category: '', priority: '', titleContains: '' },
  actions: [{ id: 'assign_to_user', target: '' }],
}

function WorkflowRow({ wf, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => setExpanded(p => !p)}>
        <div className="flex items-center gap-3">
          <Zap size={14} style={{ color: wf.active ? 'var(--accent)' : 'var(--text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{wf.name}</span>
          <Badge variant={wf.active ? 'green' : 'gray'}>{wf.active ? 'Active' : 'Disabled'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onToggle(wf) }} className="p-1 rounded hover:bg-[var(--bg-elevated)]">
            {wf.active ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} /> : <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(wf.id) }} className="p-1 rounded hover:bg-[var(--bg-elevated)]">
            <Trash2 size={14} className="text-red-400" />
          </button>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>CONDITIONS (all must match)</p>
              {Object.entries(wf.conditions ?? {}).filter(([,v]) => v).map(([k,v]) => (
                <div key={k} className="flex gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
              {!Object.values(wf.conditions ?? {}).some(Boolean) && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No conditions — applies to all tickets</p>}
            </div>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ACTIONS</p>
              {(wf.actions ?? []).map((a, i) => {
                const meta = ACTIONS_META.find(m => m.id === a.id)
                return (
                  <div key={i} className="flex gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{meta?.label ?? a.id}</span>
                    {a.target && <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{a.target}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_WF)
  const [saving, setSaving]       = useState(false)

  const load = () => getDocs(collection(db, 'workflows'))
    .then(s => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side by createdAt descending to avoid needing a Firestore index
      docs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0
        const tb = b.createdAt?.toMillis?.() ?? 0
        return tb - ta
      })
      setWorkflows(docs)
    })
    .catch(err => {
      console.error('Workflow load error:', err)
      setWorkflows([])
    })

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Workflow name required'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'workflows'), { ...form, createdAt: serverTimestamp() })
      toast.success('Workflow created')
      setForm(EMPTY_WF); setShowForm(false); load()
    } catch { toast.error('Failed to create workflow') }
    finally { setSaving(false) }
  }

  const handleToggle = async (wf) => {
    try { await updateDoc(doc(db, 'workflows', wf.id), { active: !wf.active }); load() }
    catch { toast.error('Failed to update') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this workflow?')) return
    try { await deleteDoc(doc(db, 'workflows', id)); toast.success('Workflow deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const setC = (k, v) => setForm(p => ({ ...p, conditions: { ...p.conditions, [k]: v } }))
  const setA = (i, k, v) => setForm(p => { const a = [...p.actions]; a[i] = { ...a[i], [k]: v }; return { ...p, actions: a } })
  const addAction = () => setForm(p => ({ ...p, actions: [...p.actions, { id: 'add_tag', target: '' }] }))
  const removeAction = (i) => setForm(p => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Workflow Automation</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Auto-route, assign, and escalate tickets based on conditions</p>
        </div>
        <Button icon={Plus} onClick={() => setShowForm(p => !p)}>New Workflow</Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>New Workflow Rule</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Workflow Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Auto-assign P1 network incidents" className="nd-input w-full" />
            </div>

            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>CONDITIONS — When ticket matches:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Ticket Type</label>
                  <select value={form.conditions.type} onChange={e => setC('type', e.target.value)} className="nd-input w-full">
                    <option value="">Any type</option>
                    {Object.entries(TICKET_TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
                  <select value={form.conditions.category} onChange={e => setC('category', e.target.value)} className="nd-input w-full">
                    <option value="">Any category</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Priority</label>
                  <select value={form.conditions.priority} onChange={e => setC('priority', e.target.value)} className="nd-input w-full">
                    <option value="">Any priority</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Title Contains</label>
                  <input value={form.conditions.titleContains} onChange={e => setC('titleContains', e.target.value)}
                    placeholder="e.g. VPN, password reset" className="nd-input w-full" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ACTIONS — Then do:</p>
                <button onClick={addAction} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}><Plus size={11} /> Add Action</button>
              </div>
              {form.actions.map((a, i) => {
                const meta = ACTIONS_META.find(m => m.id === a.id)
                return (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <select value={a.id} onChange={e => setA(i, 'id', e.target.value)} className="nd-input flex-1">
                      {ACTIONS_META.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    {meta?.hasTarget && (
                      meta?.options
                        ? <select value={a.target} onChange={e => setA(i, 'target', e.target.value)} className="nd-input flex-1">
                            <option value="">Select…</option>
                            {meta.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        : <input value={a.target} onChange={e => setA(i, 'target', e.target.value)}
                            placeholder={meta?.targetLabel} className="nd-input flex-1" />
                    )}
                    {form.actions.length > 1 && (
                      <button onClick={() => removeAction(i)} className="p-2 hover:bg-[var(--bg-hover)] rounded"><Trash2 size={13} className="text-red-400" /></button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_WF) }}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Create Workflow</Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {workflows.length === 0 && !showForm
        ? <EmptyState 
  title="No workflows yet" 
  description="Create automation rules to route and assign tickets automatically" 
  icon={Zap}
  action={<Button icon={Plus} onClick={() => setShowForm(true)}>Create First Workflow</Button>} 
/>
        : workflows.map(wf => <WorkflowRow key={wf.id} wf={wf} onToggle={handleToggle} onDelete={handleDelete} />)}
    </div>
  )
}
