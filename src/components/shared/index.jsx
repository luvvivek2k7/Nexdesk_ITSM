// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Shared UI Components
// Badge, Button, Card, Spinner, EmptyState, StatCard, SLABar, Toggle
// ─────────────────────────────────────────────────────────────────────────────
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import { getSLABarColor, getSLABgClass } from '@/lib/sla'

// ── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className, dot }) {
  const variants = {
    default:  'bg-gray-500/10 text-gray-400 border-gray-500/20',
    blue:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green:    'bg-green-500/10 text-green-400 border-green-500/20',
    amber:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red:      'bg-red-500/10 text-red-400 border-red-500/20',
    violet:   'bg-violet-500/10 text-violet-400 border-violet-500/20',
    cyan:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    orange:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  return (
    <span className={clsx('nd-badge border text-[11px]', variants[variant], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', `bg-current`)} />}
      {children}
    </span>
  )
}

// ── Priority badge ─────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const colors = { P1: 'red', P2: 'orange', P3: 'amber', P4: 'blue' }
  return <Badge variant={colors[priority] ?? 'default'}>{priority}</Badge>
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const colors = {
    NEW: 'violet', OPEN: 'blue', ASSIGNED: 'cyan',
    IN_PROGRESS: 'amber', ON_HOLD: 'default', PENDING: 'amber',
    RESOLVED: 'green', CLOSED: 'default', CANCELLED: 'red',
  }
  const labels = {
    NEW: 'New', OPEN: 'Open', ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold', PENDING: 'Pending',
    RESOLVED: 'Resolved', CLOSED: 'Closed', CANCELLED: 'Cancelled',
  }
  return (
    <Badge variant={colors[status] ?? 'default'} dot>
      {labels[status] ?? status}
    </Badge>
  )
}

// ── SLA status badge ──────────────────────────────────────────────────────────
export function SLABadge({ status }) {
  const labels = {
    on_track: 'On Track', warning: 'Warning',
    at_risk: 'At Risk',   breached: 'Breached',
  }
  return (
    <span className={clsx('nd-badge border text-[11px]', getSLABgClass(status))}>
      {labels[status] ?? status}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  loading, disabled, onClick, type = 'button', className, icon: Icon,
}) {
  const variants = {
    primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
    ghost:   'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
    danger:  'bg-[var(--danger-subtle)] border border-red-500/20 text-red-400 hover:bg-red-500/20',
    success: 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variants[variant], sizes[size], className,
      )}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : Icon && <Icon size={size === 'sm' ? 12 : 14} />
      }
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className, padding = true, onClick }) {
  return (
    <div
      className={clsx(
        'nd-card',
        padding && 'p-4',
        onClick && 'cursor-pointer hover:border-[var(--border-strong)] transition-colors',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={clsx('flex items-start justify-between mb-4', className)}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={clsx('animate-spin', className)} style={{ color: 'var(--accent)' }} />
}

// ── Loading Screen ────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
        >
          <span className="text-white font-bold">N</span>
        </div>
        <Spinner size={18} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading NexDesk…</p>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <Icon size={22} style={{ color: 'var(--text-muted)' }} />
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, color = 'blue', icon: Icon, onClick }) {
  const colorMap = {
    blue:   { bar: '#3b62f5', bg: 'rgba(59,98,245,0.08)'   },
    green:  { bar: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
    amber:  { bar: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
    red:    { bar: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
    violet: { bar: '#8b5cf6', bg: 'rgba(139,92,246,0.08)'  },
    cyan:   { bar: '#06b6d4', bg: 'rgba(6,182,212,0.08)'   },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <div
      className={clsx('nd-stat', onClick && 'cursor-pointer hover:border-[var(--border-strong)] transition-all')}
      onClick={onClick}
      style={{ borderTop: `2px solid ${c.bar}` }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
            <Icon size={14} style={{ color: c.bar }} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold font-mono leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      {trend && (
        <p className={clsx('text-xs mt-1', trend.up ? 'text-green-400' : 'text-red-400')}>
          {trend.up ? '↑' : '↓'} {trend.label}
        </p>
      )}
    </div>
  )
}

// ── SLA Progress Bar ──────────────────────────────────────────────────────────
export function SLABar({ sla, label, showLabel = true, compact = false }) {
  if (!sla) return null
  const { resolution } = sla
  const color = getSLABarColor(resolution.status)

  return (
    <div className={compact ? '' : 'space-y-1.5'}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px]">
          <span style={{ color: 'var(--text-muted)' }}>{label ?? 'Resolution SLA'}</span>
          <SLABadge status={resolution.status} />
        </div>
      )}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${resolution.percentage}%`, background: color }}
        />
      </div>
      {!compact && (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {resolution.percentage}% elapsed · {resolution.breached ? 'Breached' : `${Math.round(resolution.remainingMs / 3600000)}h remaining`}
        </p>
      )}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex-1 mr-4">
        {label && <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>}
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange?.(!enabled)}
        className={clsx(
          'nd-toggle flex-shrink-0',
          enabled ? 'bg-blue-500' : 'bg-[var(--bg-elevated)]',
        )}
        style={{ border: '1px solid var(--border-default)' }}
      >
        <span
          className={clsx('nd-toggle-thumb shadow-sm', enabled ? 'translate-x-4' : 'translate-x-0.5')}
        />
      </button>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <input className="nd-input" {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <select className="nd-input" {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, error, rows = 3, className, ...props }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <textarea className="nd-input resize-none" rows={rows} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ className }) {
  return <div className={clsx('h-px', className)} style={{ background: 'var(--border-subtle)' }} />
}

// ── AI Insight box ────────────────────────────────────────────────────────────
export function AIInsight({ children, type = 'info' }) {
  const styles = {
    info:    { bg: 'var(--accent-subtle)',  border: 'var(--accent-border)',         icon: '💡' },
    warning: { bg: 'var(--warning-subtle)', border: 'rgba(245,158,11,0.2)',         icon: '⚠️' },
    success: { bg: 'var(--success-subtle)', border: 'rgba(34,197,94,0.2)',          icon: '✅' },
    danger:  { bg: 'var(--danger-subtle)',  border: 'rgba(239,68,68,0.2)',          icon: '🚨' },
  }
  const s = styles[type] ?? styles.info
  return (
    <div
      className="flex items-start gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: 'var(--text-secondary)' }}
    >
      <span className="text-sm flex-shrink-0 mt-px">{s.icon}</span>
      <div>{children}</div>
    </div>
  )
}

// ── Countdown Timer ────────────────────────────────────────────────────────────
export function CountdownTimer({ remainingMs, compact }) {
  if (!remainingMs) return null
  const breached = remainingMs <= 0
  const abs = Math.abs(remainingMs)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)

  const display = h > 0
    ? `${breached ? '-' : ''}${h}h ${m}m`
    : `${breached ? '-' : ''}${m}m ${s}s`

  return (
    <span
      className={clsx(
        'font-mono text-sm font-semibold',
        breached ? 'text-red-400' : remainingMs < 3600000 ? 'text-amber-400' : 'text-green-400',
      )}
    >
      {display}
    </span>
  )
}

export default {
  Badge, PriorityBadge, StatusBadge, SLABadge,
  Button, Card, CardHeader, Spinner, LoadingScreen,
  EmptyState, StatCard, SLABar, Toggle,
  Input, Select, Textarea, Divider, AIInsight, CountdownTimer,
}
