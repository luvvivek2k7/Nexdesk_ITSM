// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Icon Nav Rail (FIXED v2)
// Phase 2 modules now enabled. Role-based visibility. Correct active detection.
// ─────────────────────────────────────────────────────────────────────────────
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Ticket, Monitor, Shield, Users, MapPin,
  Building2, Bell, Settings, Menu, Sun, Moon,
  Crown, Headphones, BarChart3, Code2, Wrench, User, Info,
} from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { ROLES }    from '@/lib/constants'
import clsx         from 'clsx'

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

// Each module: which roles can access it
const NAV_ITEMS = [
  {
    path: '/portal', icon: Home, label: 'Portal',
    roles: null, // everyone
  },
  {
    path: '/itsm', icon: Ticket, label: 'ITSM',
    roles: null, // everyone
    badge: true,
  },
  {
    path: '/itam', icon: Monitor, label: 'ITAM',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  },
  {
    path: '/iam', icon: Shield, label: 'IAM',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
    badge: true,
  },
  {
    path: '/hrms', icon: Users, label: 'HRMS',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.HR, ROLES.MANAGER],
  },
  {
    path: '/fso', icon: MapPin, label: 'Field Services',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.FIELD_ENGINEER, ROLES.MANAGER],
  },
  {
    path: '/visitor', icon: Building2, label: 'Visitor Mgmt',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
    badge: true,
  },
]

export default function IconNav({ onToggleSidebar }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const currentBase = '/' + (location.pathname.split('/')[1] || '')
  const RoleIcon    = ROLE_ICONS[profile?.role] ?? User
  const userRole    = profile?.role

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (userRole && item.roles.includes(userRole))
  )

  return (
    <nav
      className="flex flex-col items-center py-3 gap-0.5 flex-shrink-0 z-20"
      style={{
        width: 52,
        background:  'var(--bg-surface)',
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
      <button
        onClick={onToggleSidebar}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title="Toggle sidebar"
      >
        <Menu size={16} />
      </button>

      <div className="w-6 h-px my-1" style={{ background: 'var(--border-subtle)' }} />

      {/* Module nav */}
      {visibleItems.map(item => {
        const isActive = currentBase === item.path ||
          (item.path !== '/portal' && location.pathname.startsWith(item.path))

        return (
          <div key={item.path} className="relative group">
            <button
              onClick={() => navigate(item.path)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 relative"
              style={isActive
                ? { background: 'var(--accent-subtle)', color: 'var(--accent)' }
                : { color: 'var(--text-muted)' }
              }
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              title={item.label}
            >
              <item.icon size={17} />
              {item.badge && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>

            {/* Tooltip */}
            <div
              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs
                         whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50
                         transition-opacity duration-150"
              style={{
                background: 'var(--bg-elevated)',
                border:     '1px solid var(--border-default)',
                color:      'var(--text-primary)',
                boxShadow:  '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {item.label}
            </div>
          </div>
        )
      })}

      {/* Bottom actions */}
      <div className="mt-auto flex flex-col items-center gap-0.5">
        <div className="w-6 h-px mb-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Notifications"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* About / Support */}
        <button
          onClick={() => navigate('/about')}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            color:      location.pathname === '/about' ? 'var(--accent)' : 'var(--text-muted)',
            background: location.pathname === '/about' ? 'var(--accent-subtle)' : 'transparent',
          }}
          onMouseEnter={e => { if (location.pathname !== '/about') e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { if (location.pathname !== '/about') e.currentTarget.style.background = 'transparent' }}
          title="About / Support"
        >
          <Info size={15} />
        </button>

        {/* Admin settings — only for admins */}
        {[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(userRole) && (
          <button
            onClick={() => navigate('/admin/settings')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
              color:      currentBase === '/admin' ? 'var(--accent)' : 'var(--text-muted)',
              background: currentBase === '/admin' ? 'var(--accent-subtle)' : 'transparent',
            }}
            onMouseEnter={e => { if (currentBase !== '/admin') e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (currentBase !== '/admin') e.currentTarget.style.background = 'transparent' }}
            title="Admin Settings"
          >
            <Settings size={15} />
          </button>
        )}

        {/* Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full flex items-center justify-center mt-1 overflow-hidden
                     transition-all duration-150 hover:ring-2 ring-blue-500/40"
          style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)', flexShrink: 0 }}
          title={`${profile?.displayName ?? 'Profile'} (${profile?.role ?? ''})`}
        >
          {profile?.photoURL
            ? <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" />
            : <RoleIcon size={14} className="text-white" />
          }
        </button>
      </div>
    </nav>
  )
}
