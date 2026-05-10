// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Icon Navigation Rail
// Leftmost fixed rail with module icons, persona avatar, theme toggle
// ─────────────────────────────────────────────────────────────────────────────
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Ticket, Monitor, Shield, Users, MapPin,
  Building2, Bell, Settings, Menu, Sun, Moon,
  Crown, Headphones, BarChart3, Code2, Wrench, User,
} from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { db, collection, query, where, onSnapshot } from '@/lib/firebase'
import { useTheme } from '@/context/ThemeContext'
import { ROLES }    from '@/lib/constants'
import clsx from 'clsx'

const ROLE_ICONS = {
  [ROLES.SUPER_ADMIN]:    Crown,
  [ROLES.IT_ADMIN]:       Settings,
  [ROLES.IT_AGENT]:       Headphones,
  [ROLES.MANAGER]:        BarChart3,
  [ROLES.DEVELOPER]:      Code2,
  [ROLES.HR]:             Users,
  [ROLES.FIELD_ENGINEER]: Wrench,
  [ROLES.USER]:           User,
}

const NAV_ITEMS = [
  { path: '/portal',      icon: Home,      label: 'Portal',         phase: 1 },
  { path: '/itsm',        icon: Ticket,    label: 'ITSM',           phase: 1, badge: true },
  { path: '/itam',        icon: Monitor,   label: 'ITAM',           phase: 2 },
  { path: '/iam',         icon: Shield,    label: 'IAM',            phase: 2 },
  { path: '/hrms',        icon: Users,     label: 'HRMS',           phase: 3 },
  { path: '/fso',         icon: MapPin,    label: 'Field Services', phase: 2 },
  { path: '/visitor',     icon: Building2, label: 'Visitor',        phase: 2 },
]

export default function IconNav({ onToggleSidebar }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const currentBase = '/' + (location.pathname.split('/')[1] || '')
  const RoleIcon = ROLE_ICONS[profile?.role] ?? User
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('read', '==', false)
    )
    return onSnapshot(q, snap => setNotifCount(snap.size), () => {})
  }, [profile?.uid])

  return (
    <nav
      className="flex flex-col items-center py-3 gap-1 flex-shrink-0 z-20"
      style={{
        width: 52,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand mark */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 cursor-pointer select-none flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
        onClick={() => navigate('/portal')}
        title="NexDesk Home"
      >
        <span className="text-white font-bold text-sm">N</span>
      </div>

      {/* Hamburger */}
      <IconBtn icon={Menu} onClick={onToggleSidebar} label="Toggle sidebar" />

      <div className="w-6 h-px my-1" style={{ background: 'var(--border-subtle)' }} />

      {/* Module nav */}
      {NAV_ITEMS.map(item => {
        const active  = currentBase === item.path ||
                        (item.path !== '/portal' && location.pathname.startsWith(item.path))
        const planned = item.phase > 1

        return (
          <div key={item.path} className="relative group">
            <button
              onClick={() => planned ? null : navigate(item.path)}
              className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
                active && 'text-blue-400',
                !active && !planned && 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                planned && 'text-[var(--text-disabled)] cursor-not-allowed opacity-50',
              )}
              style={active ? { background: 'var(--accent-subtle)', color: 'var(--accent)' } : {}}
              title={item.label}
            >
              <item.icon size={17} />
              {/* Phase badge for planned */}
              {planned && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--bg-hover)] border border-[var(--border-default)] flex items-center justify-center text-[8px] text-[var(--text-muted)]">
                  {item.phase}
                </span>
              )}
            </button>

            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-150"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {item.label}
              {planned && <span className="ml-1 text-[var(--text-muted)]">(Phase {item.phase})</span>}
            </div>
          </div>
        )
      })}

      {/* Bottom actions */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="w-6 h-px mb-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          title="Notifications"
        >
          <Bell size={16} />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-white font-bold px-0.5">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/admin/settings')}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full flex items-center justify-center mt-1 transition-all duration-150 hover:ring-2 ring-blue-500/40"
          style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          title={`${profile?.displayName ?? 'Profile'} (${profile?.role ?? ''})`}
        >
          {profile?.photoURL
            ? <img src={profile.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
            : <RoleIcon size={14} className="text-white" />
          }
        </button>
      </div>
    </nav>
  )
}

function IconBtn({ icon: Icon, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      title={label}
    >
      <Icon size={16} />
    </button>
  )
}
