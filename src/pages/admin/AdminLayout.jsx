// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Admin Layout
// Sidebar nav for all admin sub-pages
// ─────────────────────────────────────────────────────────────────────────────
import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/lib/constants'
import { Users, Shield, Settings, Zap, UsersRound } from 'lucide-react'

const NAV = [
  { to: '/admin/users',    label: 'User Management',    icon: Users    },
  { to: '/admin/groups',   label: 'Assignment Groups',  icon: UsersRound    },
  { to: '/admin/roles',    label: 'Roles & Permissions',icon: Shield   },
  { to: '/admin/workflow', label: 'Workflow Automation', icon: Zap      },
  { to: '/admin/settings', label: 'System Settings',    icon: Settings },
]

export default function AdminLayout() {
  const { profile } = useAuth()
  if (![ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(profile?.role)) {
    return <Navigate to="/portal" replace />
  }
  return (
    <div className="flex gap-5 animate-fade-in">
      {/* Sidebar */}
      <nav className="w-48 flex-shrink-0 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'text-blue-400 bg-[var(--accent-subtle)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
