import { useState, useEffect } from 'react'
import { db, collection, getDocs, doc, updateDoc, serverTimestamp } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { ROLES, ROLE_META } from '@/lib/constants'
import { Card, Badge, Button, Select } from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { Users, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function UsersPage() {
  const { profile: me, can } = useAuth()
  const [users,  setUsers]  = useState([])
  const [search, setSearch] = useState('')
  const [loading,setLoading]= useState(true)

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  const handleRoleChange = async (uid, newRole) => {
    if (!can('ASSIGN_ROLES')) return toast.error('Insufficient permissions')
    await updateDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() })
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u))
    toast.success('Role updated')
  }

  const filtered = users.filter(u =>
    !search.trim() ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{users.length} registered users</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <Search size={13} style={{ color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm flex-1" style={{ color: 'var(--text-primary)' }} />
      </div>

      <Card padding={false}>
        {loading
          ? <div className="flex justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
          : (
            <div className="overflow-x-auto">
              <table className="nd-table">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Department</th><th>Role</th><th>Last Seen</th>
                    {can('ASSIGN_ROLES') && <th>Change Role</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const roleMeta = ROLE_META[user.role]
                    const lastSeen = user.lastSeenAt?.toDate?.()
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>
                              {user.displayName?.charAt(0) ?? 'U'}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.displayName}</span>
                          </div>
                        </td>
                        <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</span></td>
                        <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.department || '—'}</span></td>
                        <td>
                          <Badge variant="blue">{roleMeta?.label ?? user.role}</Badge>
                        </td>
                        <td>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {lastSeen ? formatDistanceToNow(lastSeen, { addSuffix: true }) : '—'}
                          </span>
                        </td>
                        {can('ASSIGN_ROLES') && (
                          <td>
                            <select
                              value={user.role}
                              onChange={e => handleRoleChange(user.id, e.target.value)}
                              disabled={user.id === me?.uid}
                              className="nd-input text-xs py-1"
                              style={{ width: 'auto' }}
                            >
                              {Object.entries(ROLE_META).map(([key, meta]) => (
                                <option key={key} value={key}>{meta.label}</option>
                              ))}
                            </select>
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
    </div>
  )
}
