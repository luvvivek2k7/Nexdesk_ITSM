// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Login Page
// Google OAuth sign-in with role explanation and theme toggle
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion }   from 'framer-motion'
import { Chrome, Sun, Moon, Shield, AlertTriangle } from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { ROLE_META, ROLES } from '@/lib/constants'

const PERSONA_PREVIEWS = [
  { role: ROLES.SUPER_ADMIN,    emoji: '👑', desc: 'Full platform control'     },
  { role: ROLES.IT_AGENT,       emoji: '🎧', desc: 'Ticket queue & SLA'        },
  { role: ROLES.MANAGER,        emoji: '📋', desc: 'Team view & approvals'     },
  { role: ROLES.FIELD_ENGINEER, emoji: '🔧', desc: 'Work orders & dispatch'    },
  { role: ROLES.USER,           emoji: '👤', desc: 'Self-service portal'       },
  { role: ROLES.HR,             emoji: '🧑‍💼', desc: 'HRMS & people data'     },
]

export default function LoginPage() {
  const { user, signIn, loading } = useAuth()
  const { isDark, toggleTheme }   = useTheme()
  const [signing, setSigning]     = useState(false)
  const [error,   setError]       = useState(null)

  // Already logged in
  if (user && !loading) return <Navigate to="/portal" replace />

  const handleSignIn = async () => {
    setSigning(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      setError(
        err.code === 'auth/popup-closed-by-user'
          ? 'Sign-in popup was closed. Please try again.'
          : err.code === 'auth/network-request-failed'
          ? 'Network error. Check your connection.'
          : 'Sign-in failed. Please try again.'
      )
      setSigning(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 25% 50%, rgba(59,98,245,0.06) 0%, transparent 70%),
                       radial-gradient(ellipse 50% 60% at 75% 40%, rgba(124,58,237,0.04) 0%, transparent 70%)`,
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center z-10 transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
            >
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                NexDesk
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Digital Workplace Hub
              </p>
            </div>
          </div>

          <div className="h-px my-5" style={{ background: 'var(--border-subtle)' }} />

          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Sign in to your workspace
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Unified ITSM · ITAM · IAM · HRMS · Field Services
          </p>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg mb-4 text-xs"
              style={{
                background: 'var(--danger-subtle)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--danger)',
              }}
            >
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={signing}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition-all duration-150 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            {signing ? (
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Chrome size={16} />
            )}
            {signing ? 'Signing you in…' : 'Continue with Google'}
          </button>

          {/* Info note */}
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-xs mb-6"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <Shield size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <span>
              Your Google account is used for authentication only.
              Your role and permissions are managed by your NexDesk administrator.
            </span>
          </div>

          {/* Persona preview */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Platform Personas
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PERSONA_PREVIEWS.map(p => {
                const meta = ROLE_META[p.role]
                return (
                  <div
                    key={p.role}
                    className="rounded-lg p-2.5 text-center"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="text-lg mb-1">{p.emoji}</div>
                    <p className="text-[11px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {meta?.label}
                    </p>
                    <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {p.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-center text-[11px] mt-5" style={{ color: 'var(--text-muted)' }}>
            By signing in you agree to the{' '}
            <span className="underline cursor-pointer" style={{ color: 'var(--accent)' }}>Terms of Service</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
