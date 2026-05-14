// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Profile Page (FIXED)
// updateProfile now shows real errors, saves to Firestore correctly
// ─────────────────────────────────────────────────────────────────────────────
import { useState }        from 'react'
import { useAuth }         from '@/context/AuthContext'
import { useTheme }        from '@/context/ThemeContext'
import { ROLE_META }       from '@/lib/constants'
import { Card, CardHeader, Button, Input, Badge, Toggle } from '@/components/shared/index.jsx'
import { toast }           from 'react-hot-toast'
import { Save, LogOut, Moon, Sun, User } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { isDark, toggleTheme }                   = useTheme()

  const [form, setForm] = useState({
    displayName: profile?.displayName ?? '',
    phone:       profile?.phone       ?? '',
    department:  profile?.department  ?? '',
  })
  const [saving,    setSaving]    = useState(false)
  const [signingOut,setSigningOut]= useState(false)

  const roleMeta = ROLE_META[profile?.role]

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phone:       form.phone.trim(),
        department:  form.department.trim(),
      })
      toast.success('Profile saved successfully')
    } catch (err) {
      // Show the real error message so user knows what's wrong
      toast.error(err.message ?? 'Update failed — check Firestore rules are deployed')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in pb-8">
      <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>My Profile</h1>

      {/* Identity card */}
      <Card>
        <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          >
            {profile?.photoURL
              ? <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" />
              : (profile?.displayName?.charAt(0)?.toUpperCase() ?? 'U')}
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {profile?.displayName}
            </h2>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            {roleMeta && (
              <Badge variant="blue">
                {roleMeta.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
            placeholder="Your full name"
          />

          {/* Email — read-only (comes from Google) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email (from Google — cannot change)
            </label>
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background:  'var(--bg-elevated)',
                border:      '1px solid var(--border-subtle)',
                color:       'var(--text-muted)',
              }}
            >
              {user?.email}
            </div>
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
            placeholder="e.g. IT Operations, Finance, HR"
          />
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button icon={Save} loading={saving} onClick={handleSave}>
            Save Profile
          </Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader title="Preferences" />
        <Toggle
          label="Dark Mode"
          description="Switch between dark and light theme"
          enabled={isDark}
          onChange={toggleTheme}
        />
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader title="Account Information" />
        <div className="space-y-0">
          {[
            { label: 'User ID',       value: user?.uid?.substring(0, 20) + '…' },
            { label: 'Role',          value: `${roleMeta?.label ?? profile?.role}` },
            { label: 'Auth Provider', value: 'Google OAuth 2.0' },
            { label: 'Account Status',value: profile?.active !== false ? '✅ Active' : '🚫 Inactive' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-center py-2.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign out */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sign Out</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              You'll need to sign in again with Google
            </p>
          </div>
          <Button
            variant="danger"
            icon={LogOut}
            loading={signingOut}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
