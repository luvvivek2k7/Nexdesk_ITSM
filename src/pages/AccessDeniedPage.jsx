// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Access Denied Page
// Shown when a non-allowlisted Google account attempts to sign in,
// or when an account has been deactivated by an administrator.
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from '@/context/AuthContext'
import { ShieldOff, Mail, ArrowLeft } from 'lucide-react'

export default function AccessDeniedPage({ reason = 'denied' }) {
  const { signOut, user } = useAuth()

  const copy = {
    denied: {
      icon:  '🚫',
      title: 'Access Not Granted',
      body:  'Your account has not been provisioned in NexDesk. Only users pre-authorised by an administrator can sign in. Contact your IT team or system administrator to request access.',
      cta:   'Request Access',
      href:  'mailto:luvvivek2k7@gmail.com?subject=NexDesk Access Request&body=Name: %0AOrganisation: %0AEmail: ' + encodeURIComponent(user?.email ?? ''),
    },
    deactivated: {
      icon:  '🔒',
      title: 'Account Deactivated',
      body:  'Your NexDesk account has been deactivated by an administrator. Please contact your IT helpdesk or system administrator to restore access.',
      cta:   'Contact IT Helpdesk',
      href:  'mailto:luvvivek2k7@gmail.com?subject=NexDesk Account Reactivation&body=Email: ' + encodeURIComponent(user?.email ?? ''),
    },
    error: {
      icon:  '⚠️',
      title: 'Sign-in Error',
      body:  'An unexpected error occurred while signing in. Please try again. If the issue persists, contact your administrator.',
      cta:   null,
    },
  }[reason] ?? {}

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.06) 0%, transparent 65%)',
        }}
      />

      <div
        className="relative w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: 'var(--bg-surface)',
          border:     '1px solid rgba(239,68,68,0.25)',
          boxShadow:  '0 0 40px rgba(239,68,68,0.08)',
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {copy.icon}
        </div>

        {/* NexDesk wordmark */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          >N</div>
          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>NexDesk</span>
        </div>

        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {copy.title}
        </h1>

        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {copy.body}
        </p>

        {/* Signed-in as */}
        {user?.email && (
          <div
            className="flex items-center justify-center gap-2 text-xs mb-6 px-4 py-2.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <Mail size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Signed in as</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user.email}
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3">
          {copy.cta && (
            <a
              href={copy.href}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Mail size={14} />
              {copy.cta}
            </a>
          )}

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border:     '1px solid var(--border-default)',
              color:      'var(--text-secondary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            <ArrowLeft size={14} />
            Sign out &amp; try a different account
          </button>
        </div>

        <p className="text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          NexDesk · Digital Workplace Hub · &copy; 2024–2026 Vivekanand Jha
        </p>
      </div>
    </div>
  )
}
