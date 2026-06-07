// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Access Denied Page
// Shown when a Google account signs in but is NOT in the users collection
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from '@/context/AuthContext'
import { Shield, LogOut } from 'lucide-react'

export default function AccessDeniedPage() {
  const { user, signOut } = useAuth()

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Shield size={28} className="text-red-400" />
        </div>

        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Access Denied
        </h1>

        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Your account has not been provisioned for NexDesk.
        </p>

        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>.
          Please contact your IT administrator to request access.
        </p>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
