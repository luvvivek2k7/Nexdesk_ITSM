// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Sidebar
// Dynamic secondary nav based on active module, persona-filtered
// ─────────────────────────────────────────────────────────────────────────────
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, Clock, BookOpen, ShoppingBag,
  AlertTriangle, GitBranch, Package, RefreshCw, BarChart3,
  Users, Settings, Shield, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { db, collection, query, where, onSnapshot } from '@/lib/firebase'
import { ROLES } from '@/lib/constants'
import { PERMISSIONS } from '@/lib/constants'
import clsx from 'clsx'

// ── Sidebar configs per module ───────────────────────────────────────────────
const SIDEBAR_CONFIGS = {
  '/portal': {
    title: 'Portal',
    sections: [
      {
        items: [
          { path: '/portal',            label: 'Home',           icon: LayoutDashboard },
          { path: '/itsm/catalog',      label: 'Service Catalog', icon: ShoppingBag    },
          { path: '/itsm/knowledge',    label: 'Knowledge Base',  icon: BookOpen       },
          { path: '/itsm/tickets',      label: 'My Tickets',     icon: Ticket,  badge: true },
          { path: '/notifications',     label: 'Notifications',  icon: Clock          },
        ],
      },
    ],
  },

  '/itsm': {
    title: 'ITSM',
    subtitle: 'IT Service Management',
    sections: [
      {
        label: 'Operations',
        items: [
          { path: '/itsm/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
          { path: '/itsm/tickets',     label: 'All Tickets',     icon: Ticket,  badge: true, permission: 'VIEW_ALL_TICKETS' },
          { path: '/itsm/tickets?type=INCIDENT',      label: 'Incidents',   icon: AlertTriangle },
          { path: '/itsm/tickets?type=PROBLEM',       label: 'Problems',    icon: RefreshCw     },
          { path: '/itsm/tickets?type=CHANGE',        label: 'Changes',     icon: GitBranch     },
          { path: '/itsm/tickets?type=SERVICE_REQUEST',label: 'Requests',   icon: Package       },
        ],
      },
      {
        label: 'Management',
        items: [
          { path: '/itsm/sla',         label: 'SLA Management',  icon: Clock,   permission: 'VIEW_SLA_DASHBOARD' },
          { path: '/itsm/catalog',     label: 'Service Catalog', icon: ShoppingBag },
          { path: '/itsm/knowledge',   label: 'Knowledge Base',  icon: BookOpen },
          { path: '/itsm/reports',     label: 'Reports',         icon: BarChart3, permission: 'VIEW_TEAM_REPORTS' },
        ],
      },
    ],
  },

  '/admin': {
    title: 'Administration',
    subtitle: 'Platform Management',
    sections: [
      {
        label: 'Admin',
        items: [
          { path: '/admin/users',    label: 'Users',       icon: Users,    permission: 'MANAGE_USERS' },
          { path: '/admin/roles',    label: 'Roles',       icon: Shield,   permission: 'ASSIGN_ROLES' },
          { path: '/admin/settings', label: 'Settings',    icon: Settings, permission: 'MANAGE_SETTINGS' },
        ],
      },
    ],
  },
}

export default function Sidebar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { can, profile, role }   = useAuth()
  const [openTickets, setOpenTickets] = useState(0)

  useEffect(() => {
    if (!profile?.uid) return
    const constraints = [where('status', 'in', ['NEW', 'OPEN', 'ASSIGNED', 'IN_PROGRESS'])]
    if (role === ROLES.USER) constraints.push(where('requesterId', '==', profile.uid))
    const q = query(collection(db, 'tickets'), ...constraints)
    return onSnapshot(q, snap => setOpenTickets(snap.size), () => {})
  }, [profile?.uid, role])

  // Match config by current path prefix
  const base   = '/' + location.pathname.split('/')[1]
  const config = SIDEBAR_CONFIGS[base] ?? SIDEBAR_CONFIGS['/portal']

  const isActive = (path) => {
    const bare = path.split('?')[0]
    if (bare === '/portal' && location.pathname === '/portal') return true
    if (bare !== '/portal' && location.pathname.startsWith(bare) && bare !== '/') return true
    return false
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background:   'var(--bg-surface)',
        borderRight:  '1px solid var(--border-subtle)',
        width:        220,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3.5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', height: 52 }}
      >
        <div>
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {config.title}
          </p>
          {config.subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {config.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {config.sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.label && (
              <p
                className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.label}
              </p>
            )}

            {section.items.map((item) => {
              // Filter by permission
              if (item.permission && !can(item.permission)) return null

              const active = isActive(item.path)

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={clsx(
                    'nd-nav-item w-full text-left mb-0.5',
                    active && 'active',
                  )}
                >
                  <item.icon size={14} className="flex-shrink-0" />
                  <span className="flex-1 text-[13px]">{item.label}</span>
                  {item.badge && openTickets > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {openTickets > 99 ? '99+' : openTickets}
                    </span>
                  )}
                  {active && !item.badge && (
                    <ChevronRight size={12} className="ml-auto opacity-40" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-3 py-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          NexDesk v1.0.0 · Phase 1
        </p>
      </div>
    </div>
  )
}
