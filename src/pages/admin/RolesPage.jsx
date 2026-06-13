// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Roles & Permissions Page  (Sprint 1 — Custom RBAC + Firestore)
// Super Admin / Org Admin can create custom roles with per-module permissions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Plus, Shield, Edit2, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, Badge, Button, Spinner, EmptyState } from '@/components/shared/index.jsx'
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from '@/lib/firebase'
import { toast } from 'react-hot-toast'

// ── System built-in roles (read-only display) ────────────────────────────────
const SYSTEM_ROLES = [
  {
    id: 'super_admin', name: 'Super Admin', type: 'system', color: 'violet',
    desc: 'Unrestricted access across all organisations, modules, and tenants.',
    modules: { ITSM:'RW', ITAM:'RW', IAM:'RW', HRMS:'RW', FSO:'RW', Visitor:'RW', Admin:'RW', Reports:'RW' },
  },
  {
    id: 'it_admin', name: 'IT Admin', type: 'system', color: 'blue',
    desc: 'Full access within own org. Can manage users, roles, workflows.',
    modules: { ITSM:'RW', ITAM:'RW', IAM:'RW', HRMS:'R', FSO:'R', Visitor:'R', Admin:'RW(ltd)', Reports:'RW' },
  },
  {
    id: 'it_agent', name: 'IT Agent', type: 'system', color: 'blue',
    desc: 'Create/update tickets and assets. Read-only on HRMS (name/dept only).',
    modules: { ITSM:'RW', ITAM:'R', IAM:'—', HRMS:'R*', FSO:'—', Visitor:'R', Admin:'—', Reports:'R' },
  },
  {
    id: 'manager', name: 'Manager', type: 'system', color: 'green',
    desc: 'Read all modules. Approve changes, access requests and leave.',
    modules: { ITSM:'R', ITAM:'R', IAM:'R+Approve', HRMS:'R', FSO:'R', Visitor:'R', Admin:'—', Reports:'RW' },
  },
  {
    id: 'hr', name: 'HR', type: 'system', color: 'amber',
    desc: 'Full HRMS access. Read ITSM for ticket-to-employee linking.',
    modules: { ITSM:'R', ITAM:'—', IAM:'R', HRMS:'RW', FSO:'—', Visitor:'R', Admin:'—', Reports:'R(HR)' },
  },
  {
    id: 'field_engineer', name: 'Field Engineer', type: 'system', color: 'amber',
    desc: 'FSO work orders only. View assigned tickets in ITSM.',
    modules: { ITSM:'R*', ITAM:'—', IAM:'—', HRMS:'—', FSO:'RW', Visitor:'—', Admin:'—', Reports:'—' },
  },
  {
    id: 'user', name: 'End User', type: 'system', color: 'default',
    desc: 'Raise tickets, request access, pre-register visitors. Own records only.',
    modules: { ITSM:'R*', ITAM:'—', IAM:'R*', HRMS:'—', FSO:'—', Visitor:'R*', Admin:'—', Reports:'—' },
  },
]

const MODULE_LIST = ['ITSM','ITAM','IAM','HRMS','FSO','Visitor','Reports','Admin']
const ACCESS_OPTS = ['None','R','RW','Approve','Full']

const ACCESS_COLOR = {
  None:'default', R:'blue', RW:'green', Approve:'amber', Full:'violet',
}

// ── Custom role form ──────────────────────────────────────────────────────────
function CustomRoleForm({ orgId, existing, profile, onClose, onSaved }) {
  const isEdit   = !!existing
  const [name,   setName]   = useState(existing?.name   ?? '')
  const [desc,   setDesc]   = useState(existing?.desc   ?? '')
  const [base,   setBase]   = useState(existing?.base   ?? 'it_agent')
  const [perms,  setPerms]  = useState(existing?.modules ?? {
    ITSM:'R', ITAM:'None', IAM:'None', HRMS:'None',
    FSO:'None', Visitor:'None', Reports:'R', Admin:'None',
  })
  const [saving, setSaving] = useState(false)

  const setMod = (mod, val) => setPerms(p => ({ ...p, [mod]: val }))

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Role name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(), desc: desc.trim(), base, modules: perms, orgId,
        updatedAt: serverTimestamp(),
      }
      if (isEdit) {
        await updateDoc(doc(db, 'custom_roles', existing.id), payload)
        toast.success(`Role "${name}" updated`)
      } else {
        await addDoc(collection(db, 'custom_roles'), {
          ...payload,
          createdBy: profile.uid,
          createdAt: serverTimestamp(),
        })
        toast.success(`Role "${name}" created`)
      }
      onSaved()
    } catch (err) { toast.error('Save failed: ' + err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-2xl p-6 space-y-4"
        style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', maxHeight:'90vh', overflowY:'auto' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color:'var(--text-primary)' }}>
            {isEdit ? `Edit Role — ${existing.name}` : 'Create Custom Role'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'var(--bg-hover)', color:'var(--text-muted)' }}><X size={14}/></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Role Name *</label>
            <input className="nd-input w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Change Manager" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Extends Base Role</label>
            <select className="nd-input w-full" value={base} onChange={e => setBase(e.target.value)}>
              {SYSTEM_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color:'var(--text-secondary)' }}>Description</label>
          <input className="nd-input w-full" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What can this role do?" />
        </div>

        {/* Module permissions matrix */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color:'var(--text-secondary)' }}>
            MODULE PERMISSIONS
          </label>
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--border-default)' }}>
            <div className="grid grid-cols-2 px-3 py-2"
              style={{ background:'var(--bg-elevated)', borderBottom:'1px solid var(--border-subtle)' }}>
              <span className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>MODULE</span>
              <span className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>ACCESS LEVEL</span>
            </div>
            {MODULE_LIST.map(mod => (
              <div key={mod} className="grid grid-cols-2 px-3 py-2 items-center"
                style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                <span className="text-xs font-medium" style={{ color:'var(--text-primary)' }}>{mod}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {ACCESS_OPTS.map(opt => (
                    <button key={opt} onClick={() => setMod(mod, opt)}
                      className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                      style={{
                        background: perms[mod] === opt ? 'var(--accent)' : 'var(--bg-hover)',
                        color:      perms[mod] === opt ? '#fff'          : 'var(--text-muted)',
                        border:     `1px solid ${perms[mod] === opt ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      }}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm"
            style={{ border:'1px solid var(--border-default)', color:'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: saving ? 'var(--bg-hover)' : 'var(--accent)' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const { orgId, profile, isSuper, can } = useAuth()
  const canManage = can('MANAGE_ROLES') || isSuper

  const [customRoles, setCustomRoles] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState(null)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, 'custom_roles'), where('orgId','==', orgId), orderBy('name','asc')),
      snap => { setCustomRoles(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false) },
      err  => { console.warn('custom_roles:', err.message); setLoading(false) }
    )
    return unsub
  }, [orgId])

  const deleteRole = async (role) => {
    if (!window.confirm(`Delete custom role "${role.name}"? Users with this role will revert to End User.`)) return
    try {
      await deleteDoc(doc(db, 'custom_roles', role.id))
      toast.success(`Role "${role.name}" deleted`)
    } catch (err) { toast.error('Delete failed: ' + err.message) }
  }

  const toggleExpand = id => setExpanded(prev => prev === id ? null : id)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>Roles &amp; Permissions</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            System roles are built-in and cannot be edited · Custom roles can be created per org
          </p>
        </div>
        {canManage && (
          <Button size="sm" icon={Plus} onClick={() => { setEditing(null); setShowForm(true) }}>
            New Custom Role
          </Button>
        )}
      </div>

      {/* System Roles */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--text-muted)' }}>
          SYSTEM ROLES (built-in, read-only)
        </p>
        <div className="space-y-2">
          {SYSTEM_ROLES.map(role => (
            <div key={role.id}
              className="rounded-xl overflow-hidden"
              style={{ border:'1px solid var(--border-default)', background:'var(--bg-surface)' }}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => toggleExpand(role.id)}>
                <Shield size={14} style={{ color:'var(--accent)', flexShrink:0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{role.name}</span>
                    <Badge variant={role.color}>system</Badge>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color:'var(--text-muted)' }}>{role.desc}</p>
                </div>
                {expanded === role.id
                  ? <ChevronDown size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                  : <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
              </button>

              {expanded === role.id && (
                <div className="px-4 pb-3 pt-0">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(role.modules).map(([mod, access]) => (
                      <div key={mod} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                        <span style={{ color:'var(--text-secondary)' }}>{mod}</span>
                        <Badge variant={access.startsWith('RW') ? 'green' : access === 'R' || access.startsWith('R') ? 'blue' : access === '—' ? 'default' : 'amber'}>
                          {access}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--text-muted)' }}>
          CUSTOM ROLES ({customRoles.length})
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : customRoles.length === 0 ? (
          <Card>
            <EmptyState
              icon="🛡️"
              title="No custom roles yet"
              subtitle={canManage ? 'Create custom roles to define granular per-module permissions beyond the system defaults.' : 'No custom roles have been created for your organisation yet.'}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {customRoles.map(role => (
              <div key={role.id}
                className="rounded-xl overflow-hidden"
                style={{ border:'1px solid var(--border-default)', background:'var(--bg-surface)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={14} style={{ color:'var(--violet)', flexShrink:0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{role.name}</span>
                      <Badge variant="violet">custom</Badge>
                      <span className="text-xs" style={{ color:'var(--text-muted)' }}>extends {role.base}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{role.desc || '—'}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setEditing(role); setShowForm(true) }}
                        className="btn-icon" style={{ width:28, height:28 }}>
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={() => deleteRole(role)}
                        className="btn-icon" style={{ width:28, height:28, color:'var(--red)' }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  )}
                </div>

                {/* Module matrix */}
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(role.modules ?? {}).map(([mod, access]) => (
                      access !== 'None' && (
                        <div key={mod} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                          style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                          <span style={{ color:'var(--text-secondary)' }}>{mod}</span>
                          <Badge variant={ACCESS_COLOR[access] ?? 'default'}>{access}</Badge>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit form modal */}
      {showForm && (
        <CustomRoleForm
          orgId={orgId}
          existing={editing}
          profile={profile}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
