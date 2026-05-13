// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — User Management Page v2
// Full RBAC: invite users, assign roles, deactivate, real-time list
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import {
  db, collection, getDocs, doc, updateDoc, setDoc,
  serverTimestamp, query, orderBy,
} from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { ROLES, ROLE_META } from '@/lib/constants'
import { Card, Badge, Button, Spinner } from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { Users, Search, UserPlus, Shield, X, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Role color map ────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]:    'violet',
  [ROLES.IT_ADMIN]:       'blue',
  [ROLES.IT_AGENT]:       'cyan',
  [ROLES.MANAGER]:        'green',
  [ROLES.DEVELOPER]:      'amber',
  [ROLES.HR]:             'pink',
  [ROLES.FIELD_ENGINEER]: 'orange',
  [ROLES.USER]:           'gray',
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose, onInvited }) {
  const { profile: me } = useAuth()
  const [email,  setEmail]  = useState('')
  const [name,   setName]   = useState('')
  const [role,   setRole]   = useState(ROLES.USER)
  const [dept,   setDept]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) { toast.error('Email is required'); return }
    if (!email.includes('@')) { toast.error('Enter a valid email'); return }
    setSaving(true)
    try {
      // Create a placeholder user doc — when they first sign in via Google
      // with this email, AuthContext will find the doc exists and load it.
      // We use email as the document ID key via meta lookup.
      // Since Firebase Auth uses UID as doc ID, we store pending invites separately.
      const inviteRef = doc(db, 'invites', email.toLowerCase().trim())
      await setDoc(inviteRef, {
        email:       email.toLowerCase().trim(),
        displayName: name.trim() || email.split('@')[0],
        role,
        department:  dept.trim(),
        invitedBy:   me?.displayName ?? me?.email,
        invitedByUid: me?.uid,
        invitedAt:   serverTimestamp(),
        status:      'pending',
      })
      toast.success(`Invite created for ${email}. When they sign in with Google, they'll get the ${ROLE_META[role]?.label} role.`)
      onInvited?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Failed to create invite')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Invite User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          The invited user will get the assigned role automatically when they first sign in with their Google account.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Email Address *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@company.com"
              className="nd-input w-full" type="email" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name (optional)"
              className="nd-input w-full" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Role *</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="nd-input w-full">
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label} — {meta.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Department</label>
            <input value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. IT, HR, Finance"
              className="nd-input w-full" />
          </div>
        </div>

        {/* Role preview */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{ROLE_META[role]?.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ROLE_META[role]?.description}</p>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={UserPlus} loading={saving} onClick={handleInvite}>Create Invite</Button>
        </div>
      </div>
    </div>
  )
}

// ── Role Change Dropdown ──────────────────────────────────────────────────────
function RoleCell({ user, meUid, canAssign, onChange }) {
  const [saving, setSaving] = useState(false)

  const handleChange = async (e) => {
    const newRole = e.target.value
    if (newRole === user.role) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: newRole,
        updatedAt: serverTimestamp(),
      })
      onChange(user.id, newRole)
      toast.success(`${user.displayName ?? user.email}'s role changed to ${ROLE_META[newRole]?.label}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update role. Check Firestore permissions.')
    } finally { setSaving(false) }
  }

  if (!canAssign || user.id === meUid) {
    return <Badge variant={ROLE_COLORS[user.role] ?? 'gray'}>{ROLE_META[user.role]?.label ?? user.role}</Badge>
  }

  return (
    <div className="flex items-center gap-2">
      {saving
        ? <Spinner size={14} />
        : (
          <select value={user.role} onChange={handleChange}
            className="nd-input text-xs py-1" style={{ width: 'auto', minWidth: 140 }}>
            {Object.entries(ROLE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        )
      }
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { profile: me, can } = useAuth()
  const [users,    setUsers]    = useState([])
  const [invites,  setInvites]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [tab,      setTab]      = useState('users') // 'users' | 'invites'

  const canAssign  = can('ASSIGN_ROLES')
  const canManage  = can('MANAGE_USERS')

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersSnap, invitesSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'invites'), orderBy('invitedAt', 'desc'))),
      ])
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setInvites(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
      toast.error('Failed to load users')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const handleRoleChange = (uid, newRole) => {
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u))
  }

  const handleToggleActive = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        active: !user.active,
        updatedAt: serverTimestamp(),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u))
      toast.success(`${user.displayName} ${!user.active ? 'activated' : 'deactivated'}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update user status')
    }
  }

  const handleDeleteInvite = async (email) => {
    try {
      const { deleteDoc, doc: fDoc } = await import('@/lib/firebase')
      await deleteDoc(fDoc(db, 'invites', email))
      setInvites(prev => prev.filter(i => i.id !== email))
      toast.success('Invite removed')
    } catch { toast.error('Failed to remove invite') }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <div className="space-y-5 animate-fade-in">
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={loadData} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {users.length} registered · {invites.filter(i => i.status === 'pending').length} pending invites
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadData}>Refresh</Button>
          {canManage && (
            <Button size="sm" icon={UserPlus} onClick={() => setShowInvite(true)}>Invite User</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-elevated)' }}>
        {['users', 'invites'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)',
            }}>
            {t} {t === 'invites' && invites.length > 0 && `(${invites.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab === 'users' && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search by name, email, department, role…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: 'var(--text-primary)' }} />
          {search && <button onClick={() => setSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
        </div>
      )}

      {/* Users Table */}
      {tab === 'users' && (
        <Card padding={false}>
          {loading
            ? <div className="flex justify-center py-12"><Spinner /></div>
            : filtered.length === 0
              ? <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'No users match your search' : 'No users yet'}
                </div>
              : (
                <div className="overflow-x-auto">
                  <table className="nd-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        {canManage && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(user => {
                        const lastSeen = user.lastSeenAt?.toDate?.()
                        const isSelf   = user.id === me?.uid
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: user.active !== false ? 'linear-gradient(135deg,#3b62f5,#7c3aed)' : 'var(--bg-elevated)' }}>
                                  {user.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {user.displayName ?? '—'}
                                    {isSelf && <span className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>You</span>}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</span></td>
                            <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.department || '—'}</span></td>
                            <td>
                              <RoleCell
                                user={user}
                                meUid={me?.uid}
                                canAssign={canAssign}
                                onChange={handleRoleChange}
                              />
                            </td>
                            <td>
                              <Badge variant={user.active !== false ? 'green' : 'gray'}>
                                {user.active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {lastSeen ? formatDistanceToNow(lastSeen, { addSuffix: true }) : '—'}
                              </span>
                            </td>
                            {canManage && (
                              <td>
                                {!isSelf && (
                                  <button
                                    onClick={() => handleToggleActive(user)}
                                    title={user.active !== false ? 'Deactivate user' : 'Activate user'}
                                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                                  >
                                    {user.active !== false
                                      ? <XCircle size={14} className="text-red-400" />
                                      : <CheckCircle size={14} className="text-green-400" />}
                                  </button>
                                )}
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
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <Card padding={false}>
          {loading
            ? <div className="flex justify-center py-12"><Spinner /></div>
            : invites.length === 0
              ? <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No pending invites. Click "Invite User" to get started.
                </div>
              : (
                <div className="overflow-x-auto">
                  <table className="nd-table">
                    <thead>
                      <tr><th>Email</th><th>Name</th><th>Role</th><th>Department</th><th>Invited By</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {invites.map(inv => (
                        <tr key={inv.id}>
                          <td><span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{inv.email}</span></td>
                          <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.displayName || '—'}</span></td>
                          <td><Badge variant={ROLE_COLORS[inv.role] ?? 'gray'}>{ROLE_META[inv.role]?.label ?? inv.role}</Badge></td>
                          <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.department || '—'}</span></td>
                          <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.invitedBy}</span></td>
                          <td><Badge variant={inv.status === 'pending' ? 'amber' : 'green'}>{inv.status}</Badge></td>
                          <td>
                            <button onClick={() => handleDeleteInvite(inv.id)}
                              className="p-1.5 rounded hover:bg-[var(--bg-hover)]">
                              <X size={13} className="text-red-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </Card>
      )}

      {/* RBAC Info box */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>How Role-Based Access Works</span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <div key={key} className="p-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{meta.label}</p>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{meta.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
