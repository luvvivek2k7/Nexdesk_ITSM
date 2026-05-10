// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Profile Page
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useAuth }  from '@/context/AuthContext'
import { ROLE_META } from '@/lib/constants'
import { Card, CardHeader, Button, Input, Badge } from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { User, Mail, Phone, Building2, Save } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const [form, setForm] = useState({
    displayName: profile?.displayName ?? '',
    phone:       profile?.phone       ?? '',
    department:  profile?.department  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const roleMeta = ROLE_META[profile?.role]

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(form)
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>My Profile</h1>

      <Card>
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          >
            {profile?.photoURL
              ? <img src={profile.photoURL} alt="" className="w-full h-full rounded-2xl object-cover" />
              : (profile?.displayName?.charAt(0) ?? 'U')}
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {profile?.displayName}
            </h2>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            {roleMeta && (
              <Badge variant="blue">{roleMeta.label}</Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
          />
          <div className="rounded-lg p-3 text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <Mail size={12} /> Email (from Google — cannot change)
            </div>
            <p style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
          </div>
          <Input
            label="Phone"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Department"
            value={form.department}
            onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
            placeholder="e.g. Engineering, Finance, HR"
          />
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button icon={Save} loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="danger" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account Information" />
        <div className="space-y-2 text-sm">
          {[
            { label: 'User ID',       value: user?.uid?.substring(0, 16) + '…' },
            { label: 'Role',          value: roleMeta?.label ?? profile?.role },
            { label: 'Auth Provider', value: 'Google OAuth'   },
            { label: 'Status',        value: profile?.active ? 'Active' : 'Inactive' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
