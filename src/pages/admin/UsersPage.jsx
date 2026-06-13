// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Users Management Page (FIXED + ENHANCED)
// Super Admin: create test users, assign any role, deactivate
// IT Admin: change roles (except super_admin), view all users
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { toast }               from 'react-hot-toast'
import {
  Users, Search, Plus, Edit2, Trash2,
  RefreshCw, Shield, X, Check, Eye, EyeOff,
} from 'lucide-react'
import { db, collection, getDocs, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from '@/lib/firebase'
import { useAuth }            from '@/context/AuthContext'
import { ROLES, ROLE_META }   from '@/lib/constants'
import {
  Card, Button, Badge, Input, Select, Spinner, EmptyState, AIInsight,
} from '@/components/shared/index.jsx'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const ROLE_COLOR = {
  super_admin:    'violet',
  it_admin:       'blue',
  it_agent:       'cyan',
  manager:        'green',
  developer:      'amber',
  hr:             'pink',
  field_engineer: 'orange',
  user:           'default',
}

const ROLE_EMOJI = {
  super_admin:    '👑',
  it_admin:       '⚙️',
  it_agent:       '🎧',
  manager:        '📋',
  developer:      '💻',
  hr:             '🧑‍💼',
  field_engineer: '🔧',
  user:           '👤',
}

// ── Create / Edit User Modal ──────────────────────────────────────────────────
function UserModal({ user, onClose, onSave, isSuperAdmin, groups = [] }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    displayName: user?.displayName ?? '',
    email:       user?.email       ?? '',
    role:        user?.role        ?? ROLES.USER,
    department:  user?.department  ?? '',
    phone:       user?.phone       ?? '',
    orgName:     user?.orgName     ?? '',
    employeeId:  user?.employeeId  ?? '',
    groupId:     user?.groupId     ?? '',
    groupName:   user?.groupName   ?? '',
    active:      user?.active      ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.displayName.trim()) return toast.error('Name is required')
    if (!isEdit && !form.email.trim()) return toast.error('Email is required')
    setSaving(true)
    try {
      await onSave(form, user?.id)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit User' : 'Create Test User'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)]">
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            label="Display Name *"
            value={form.displayName}
            onChange={e => set('displayName', e.target.value)}
            placeholder="e.g. Ravi Kumar"
          />

          {!isEdit && (
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="e.g. ravi.kumar@company.com"
            />
          )}

          <Select
            label="Role / Persona"
            value={form.role}
            onChange={e => set('role', e.target.value)}
          >
            {Object.entries(ROLE_META)
              .filter(([key]) => isSuperAdmin || key !== ROLES.SUPER_ADMIN)
              .map(([key, meta]) => (
                <option key={key} value={key}>
                  {ROLE_EMOJI[key]} {meta.label}
                </option>
              ))}
          </Select>

          <Input
            label="Department"
            value={form.department}
            onChange={e => set('department', e.target.value)}
            placeholder="e.g. IT Operations"
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />

          <Input
            label="Employee ID"
            value={form.employeeId}
            onChange={e => set('employeeId', e.target.value)}
            placeholder="e.g. EMP-0042"
          />

          <Input
            label="Organisation Name"
            value={form.orgName}
            onChange={e => set('orgName', e.target.value)}
            placeholder="e.g. Accenture, Infosys…"
          />

          {/* Assignment Group — persona-based */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--text-secondary)' }}>
              Assignment Group
            </label>
            <select
              className="nd-input w-full"
              value={form.groupId}
              onChange={e => {
                const grp = groups.find(g => g.id === e.target.value)
                set('groupId',   e.target.value)
                set('groupName', grp?.name ?? '')
              }}>
              <option value="">None</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.module})</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
              Tickets assigned to this group will auto-route to this user's queue
            </p>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account Status</span>
              <button
                onClick={() => set('active', !form.active)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                  form.active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                )}
              >
                {form.active ? '✅ Active' : '🚫 Deactivated'}
              </button>
            </div>
          )}

          <AIInsight type="info">
            {isEdit
              ? 'Changes take effect immediately. The user will see their new role on next page refresh.'
              : 'This creates a placeholder record. The user gets the assigned role when they first sign in with Google using this email.'}
          </AIInsight>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button loading={saving} onClick={handleSave} className="flex-1">
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Users Page ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const { profile: me, profile, can, role: myRole, createPlaceholderUser, audit } = useAuth()
  const isSuperAdmin = myRole === ROLES.SUPER_ADMIN
  const isItAdmin    = myRole === ROLES.IT_ADMIN

  const [users,     setUsers]     = useState([])
  const [groups,    setGroups]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [roleFilter,setRoleFilter]= useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editUser,  setEditUser]  = useState(null)
  const [deleting,  setDeleting]  = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      toast.error('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    import('@/lib/assignmentService').then(({ listenToGroups }) => {
      listenToGroups(data => setGroups(data))
    })
  }, [])

  // ── Save handler (create or edit) ────────────────────────────────────────
  const handleSave = async (form, userId) => {
    if (userId) {
      // Edit existing
      const ref = doc(db, 'users', userId)
      await updateDoc(ref, {
        displayName: form.displayName,
        role:        form.role,
        department:  form.department,
        phone:       form.phone,
        active:      form.active,
        groupId:     form.groupId   ?? null,
        groupName:   form.groupName ?? null,
        employeeId:  form.employeeId ?? null,
        updatedAt:   serverTimestamp(),
      })
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, ...form } : u
      ))
      audit?.('user_updated', 'Admin', userId)
      toast.success('User updated')
    } else {
      // Create pre-authorised placeholder via AuthContext helper
      try {
        await createPlaceholderUser({
          email:       form.email,
          displayName: form.displayName,
          role:        form.role,
          department:  form.department,
          phone:       form.phone,
          orgId:       profile?.orgId  ?? 'system',
          orgName:     profile?.orgName ?? '',
          employeeId:  form.employeeId ?? '',
        })
        await fetchUsers()
        audit?.('user_created', 'Admin', form.email)
        toast.success(`${form.displayName} added — they can now sign in with ${form.email}`)
      } catch (err) {
        throw err
      }
    }
  }

  // ── Quick role change from table ──────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    if (!can('MANAGE_USERS')) return toast.error('Permission denied')
    if (userId === me?.uid) return toast.error('Cannot change your own role')
    try {
      await updateDoc(doc(db, 'users', userId), {
        role:      newRole,
        updatedAt: serverTimestamp(),
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(`Role updated to ${ROLE_META[newRole]?.label}`)
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
  }

  // ── Delete / Deactivate ───────────────────────────────────────────────────
  const handleDelete = async (userId, userName) => {
    if (!isSuperAdmin) return toast.error('Only Super Admin can delete users')
    if (userId === me?.uid) return toast.error('Cannot delete your own account')
    setDeleting(userId)
    try {
      // Soft delete — mark inactive (preserves ticket history)
      await updateDoc(doc(db, 'users', userId), {
        active:    false,
        updatedAt: serverTimestamp(),
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: false } : u))
      toast.success(`${userName} deactivated`)
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  // ── Filtered users ────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search.trim() ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  // Counts per role
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {users.length} registered users · {users.filter(u => u.active !== false).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchUsers}>
            Refresh
          </Button>
          {(isSuperAdmin || isItAdmin) && (
            <Button size="sm" icon={Plus} onClick={() => { setEditUser(null); setShowModal(true) }}>
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Role summary pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter('ALL')}
          className={clsx(
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            roleFilter === 'ALL'
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-border)]'
              : 'border-[var(--border-default)] text-[var(--text-muted)]'
          )}
        >
          All ({users.length})
        </button>
        {Object.entries(ROLE_META).map(([key, meta]) => {
          const count = roleCounts[key] ?? 0
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setRoleFilter(key === roleFilter ? 'ALL' : key)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1',
                roleFilter === key
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-border)]'
                  : 'border-[var(--border-default)] text-[var(--text-muted)]'
              )}
            >
              <span>{ROLE_EMOJI[key]}</span> {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search by name, email, department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm flex-1"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Info box for super admin */}
      {isSuperAdmin && (
        <AIInsight type="info">
          <strong>Super Admin:</strong> You can create test users for persona testing, assign any role, and deactivate accounts.
          Creating a user with an email creates a placeholder — they get the assigned role when they first sign in with that Google account.
        </AIInsight>
      )}

      {/* Users table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={search ? 'Try a different search term.' : 'No users registered yet.'}
            action={
              isSuperAdmin && (
                <Button size="sm" icon={Plus} onClick={() => { setEditUser(null); setShowModal(true) }}>
                  Add First User
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="nd-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  {(isSuperAdmin || isItAdmin) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const lastSeen   = u.lastSeenAt?.toDate?.()
                  const isMe       = u.id === me?.uid
                  const roleMeta   = ROLE_META[u.role]
                  const isInactive = u.active === false

                  return (
                    <tr
                      key={u.id}
                      style={{ opacity: isInactive ? 0.5 : 1 }}
                    >
                      {/* Avatar + name */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
                          >
                            {u.photoURL
                              ? <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                              : u.displayName?.charAt(0) ?? 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {u.displayName}
                              {isMe && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                  You
                                </span>
                              )}
                              {u.isPlaceholder && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--amber-subtle, rgba(245,158,11,0.1))', color: 'var(--warning)' }}>
                                  Pending login
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {u.email}
                        </span>
                      </td>

                      <td>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {u.department || '—'}
                        </span>
                      </td>

                      {/* Role — editable dropdown for admins */}
                      <td>
                        {(isSuperAdmin || isItAdmin) && !isMe ? (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="nd-input text-xs py-1"
                            style={{ width: 'auto', minWidth: 130 }}
                          >
                            {Object.entries(ROLE_META)
                              .filter(([key]) => isSuperAdmin || key !== ROLES.SUPER_ADMIN)
                              .map(([key, meta]) => (
                                <option key={key} value={key}>
                                  {ROLE_EMOJI[key]} {meta.label}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: 'var(--text-secondary)' }}>
                            {ROLE_EMOJI[u.role]} {roleMeta?.label ?? u.role}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          isInactive
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        )}>
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>

                      <td>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {lastSeen
                            ? formatDistanceToNow(lastSeen, { addSuffix: true })
                            : u.isPlaceholder ? 'Never signed in' : '—'}
                        </span>
                      </td>

                      {(isSuperAdmin || isItAdmin) && (
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setEditUser(u); setShowModal(true) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
                              title="Edit user"
                            >
                              <Edit2 size={12} style={{ color: 'var(--text-muted)' }} />
                            </button>
                            {isSuperAdmin && !isMe && (
                              <button
                                onClick={() => handleDelete(u.id, u.displayName)}
                                disabled={deleting === u.id}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
                                title={isInactive ? 'Already deactivated' : 'Deactivate user'}
                              >
                                {deleting === u.id
                                  ? <Spinner size={12} />
                                  : <Trash2 size={12} className="text-red-400" />
                                }
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editUser}
          groups={groups}
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onSave={handleSave}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  )
}
