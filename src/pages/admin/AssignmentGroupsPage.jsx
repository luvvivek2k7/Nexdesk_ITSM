// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Assignment Groups Page
// Create groups, add/remove members from Firestore users list
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, UserPlus, UserMinus, Users, ChevronDown, Edit3, X, Check } from 'lucide-react'
import { db, collection, getDocs } from '@/lib/firebase'
import { createGroup, getGroups, updateGroup, deleteGroup, addMember, removeMember, listenToGroups } from '@/lib/assignmentService'
import { CATEGORIES, TICKET_TYPES } from '@/lib/constants'
import { Card, CardHeader, Badge, Button, EmptyState, Spinner } from '@/components/shared/index.jsx'
import { useAuth } from '@/context/AuthContext'

function GroupCard({ group, allUsers, onDeleted }) {
  const { user: me } = useAuth()
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [name,      setName]      = useState(group.name)
  const [desc,      setDesc]      = useState(group.description ?? '')
  const [saving,    setSaving]    = useState(false)
  const [addingUid, setAddingUid] = useState('')

  const nonMembers = allUsers.filter(u => !group.members?.find(m => m.uid === u.id))

  const handleSaveMeta = async () => {
    if (!name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try { await updateGroup(group.id, { name: name.trim(), description: desc.trim() }); setEditing(false); toast.success('Group updated') }
    catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const handleAddMember = async () => {
    if (!addingUid) return
    const u = allUsers.find(x => x.id === addingUid)
    if (!u) return
    setSaving(true)
    try {
      await addMember(group.id, { uid: u.id, name: u.displayName ?? u.email, email: u.email, role: u.role })
      setAddingUid(''); toast.success(`${u.displayName} added`)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleRemoveMember = async (uid) => {
    setSaving(true)
    try { await removeMember(group.id, uid); toast.success('Member removed') }
    catch { toast.error('Failed to remove') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete group "${group.name}"?`)) return
    try { await deleteGroup(group.id); toast.success('Group deleted'); onDeleted?.() }
    catch { toast.error('Failed to delete') }
  }

  const handleToggle = async () => {
    try { await updateGroup(group.id, { active: !group.active }) }
    catch { toast.error('Failed to toggle') }
  }

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--bg-hover)]"
        onClick={() => setExpanded(p => !p)}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', opacity: group.active ? 1 : 0.4 }}>
          <Users size={14} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{group.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {group.members?.length ?? 0} members{group.description ? ` · ${group.description}` : ''}
          </p>
        </div>
        <Badge variant={group.active ? 'green' : 'gray'}>{group.active ? 'Active' : 'Disabled'}</Badge>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={handleToggle} className="p-1.5 rounded hover:bg-[var(--bg-elevated)]"
            title={group.active ? 'Disable' : 'Enable'}>
            {group.active ? <X size={13} className="text-red-400" /> : <Check size={13} className="text-green-400" />}
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-[var(--bg-elevated)]">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Edit name/desc */}
          <div className="mt-3 space-y-2">
            {editing ? (
              <>
                <input value={name} onChange={e => setName(e.target.value)} className="nd-input w-full text-sm" placeholder="Group name" />
                <input value={desc} onChange={e => setDesc(e.target.value)} className="nd-input w-full text-sm" placeholder="Description (optional)" />
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={handleSaveMeta}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent)' }}>
                <Edit3 size={11} /> Edit name / description
              </button>
            )}
          </div>

          {/* Members list */}
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              MEMBERS ({group.members?.length ?? 0})
            </p>
            {(group.members?.length ?? 0) === 0 && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>No members yet. Add users below.</p>
            )}
            {(group.members ?? []).map(m => (
              <div key={m.uid} className="flex items-center gap-2.5 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                  {(m.name ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                </div>
                <button onClick={() => handleRemoveMember(m.uid)} disabled={saving}
                  className="p-1 rounded hover:bg-[var(--bg-hover)]">
                  <UserMinus size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Add member */}
          {nonMembers.length > 0 && (
            <div className="mt-3 flex gap-2">
              <select value={addingUid} onChange={e => setAddingUid(e.target.value)} className="nd-input flex-1 text-xs">
                <option value="">— Add member —</option>
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.displayName ?? u.email} ({u.role})</option>)}
              </select>
              <Button size="sm" icon={UserPlus} loading={saving} onClick={handleAddMember} disabled={!addingUid}>Add</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AssignmentGroupsPage() {
  const { user, profile } = useAuth()
  const [groups,   setGroups]   = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ name: '', description: '', category: '', type: '' })
  const [saving,   setSaving]   = useState(false)

  // Real-time groups
  useEffect(() => {
    const unsub = listenToGroups(data => { setGroups(data); setLoading(false) }, () => setLoading(false))
    return unsub
  }, [])

  // Load all users for member picker
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Group name required'); return }
    setSaving(true)
    try {
      await createGroup(form, { uid: user.uid, displayName: profile?.displayName ?? user.email })
      toast.success(`Group "${form.name}" created`)
      setForm({ name: '', description: '', category: '', type: '' })
      setShowForm(false)
    } catch (e) { toast.error('Failed to create group') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Assignment Groups</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Organise agents into groups. Tickets are routed to groups, then assigned to individual members.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowForm(p => !p)}>New Group</Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>New Assignment Group</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Group Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Network Team, L1 Support, Security Response" className="nd-input w-full" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What does this group handle?" className="nd-input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Auto-route Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="nd-input w-full">
                  <option value="">— Any —</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Auto-route Ticket Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="nd-input w-full">
                  <option value="">— Any —</option>
                  {Object.entries(TICKET_TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              If category/type are set, new tickets matching those will be auto-routed to this group.
            </p>
            <div className="flex gap-2">
              <Button loading={saving} onClick={handleCreate}>Create Group</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm({ name:'', description:'', category:'', type:'' }) }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Groups list */}
      {loading
        ? <div className="flex justify-center py-12"><Spinner /></div>
        : groups.length === 0 && !showForm
          ? <EmptyState title="No assignment groups yet" icon={Users}
              description="Create groups to organise your support team. Agents are assigned tickets through groups."
              action={<Button icon={Plus} onClick={() => setShowForm(true)}>Create First Group</Button>} />
          : groups.map(g => (
              <GroupCard key={g.id} group={g} allUsers={users} onDeleted={() => {}} />
            ))
      }
    </div>
  )
}
