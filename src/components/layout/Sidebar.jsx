// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Sidebar  v2.0
// Phase 2: ITAM, Reports, Workflow added; all badges real
// ─────────────────────────────────────────────────────────────────────────────
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Home, Ticket, ChevronRight, LayoutDashboard, AlertTriangle,
  Bug, GitBranch, ShoppingBag, Package, SlidersHorizontal,
  Clock, BookOpen, Grid, Monitor, Cpu, Key, BarChart3,
  Users, Shield, Settings, Zap, MessageCircle,
} from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { ROLES }    from '@/lib/constants'
import { db, collection, query, where, onSnapshot } from '@/lib/firebase'
import clsx from 'clsx'

// ── Sidebar nav structure per module ────────────────────────────────────────
const MODULES = [
  {
    id: 'portal', label: 'Portal', icon: Home, path: '/portal',
    roles: null, // all
  },
  {
    id: 'itsm', label: 'ITSM', icon: Ticket, base: '/itsm', badge: true,
    roles: null,
    children: [
      { label: 'Dashboard',       icon: LayoutDashboard, path: '/itsm',          end: true },
      { label: 'Incidents',       icon: AlertTriangle,   path: '/itsm/tickets',  q: { type: 'INCIDENT' } },
      { label: 'Problems',        icon: Bug,             path: '/itsm/tickets',  q: { type: 'PROBLEM'  } },
      { label: 'Changes',         icon: GitBranch,       path: '/itsm/tickets',  q: { type: 'CHANGE'   } },
      { label: 'Requests',        icon: ShoppingBag,     path: '/itsm/tickets',  q: { type: 'SERVICE_REQUEST' } },
      { label: 'SLA Dashboard',   icon: Clock,           path: '/itsm/sla',      perm: 'VIEW_SLA_DASHBOARD' },
      { label: 'Knowledge Base',  icon: BookOpen,        path: '/itsm/knowledge' },
      { label: 'Service Catalog', icon: Grid,            path: '/itsm/catalog'   },
    ],
  },
  {
    id: 'itam', label: 'ITAM', icon: Monitor, base: '/itam',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
    perm: 'ACCESS_ITAM',
    children: [
      { label: 'Dashboard',    icon: LayoutDashboard, path: '/itam',          end: true },
      { label: 'All Assets',   icon: Cpu,             path: '/itam/assets'   },
      { label: 'Add Asset',    icon: Package,         path: '/itam/assets/new', perm: 'MANAGE_ITAM' },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.IT_AGENT],
    perm: 'VIEW_REPORTS',
  },
  {
    id: 'admin', label: 'Admin', icon: Settings, base: '/admin',
    roles: [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
    perm: 'ACCESS_ADMIN_PANEL',
    children: [
      { label: 'Users',      icon: Users,   path: '/admin/users'     },
      { label: 'Roles',      icon: Shield,  path: '/admin/roles'     },
      { label: 'Workflows',  icon: Zap,     path: '/admin/workflows', perm: 'MANAGE_WORKFLOWS' },
      { label: 'Assignment Groups', icon: Users, path: '/admin/groups', perm: 'MANAGE_USERS' },
      { label: 'Settings',   icon: Settings,path: '/admin/settings'  },
    ],
  },
]

function NavItem({ icon: Icon, label, path, end, active, badge }) {
  return (
    <NavLink to={path} end={end}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 group',
        isActive || active ? 'font-medium' : 'font-normal opacity-70 hover:opacity-100 hover:bg-[var(--bg-hover)]'
      )}
      style={({ isActive }) => isActive || active
        ? { background: 'var(--accent)', color: '#fff' }
        : { color: 'var(--text-secondary)' }
      }
    >
      <Icon size={13} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed }) {
  const location = useLocation()
  const { can, role, profile } = useAuth()
  const [expanded, setExpanded] = useState({ itsm: true })
  const [openTickets, setOpenTickets] = useState(0)

  // Real-time open ticket badge
  useEffect(() => {
    if (!profile?.uid) return
    const constraints = [where('status', 'in', ['NEW','OPEN','ASSIGNED','IN_PROGRESS'])]
    if (role === ROLES.USER) constraints.push(where('requesterId', '==', profile.uid))
    const q = query(collection(db, 'tickets'), ...constraints)
    return onSnapshot(q, s => setOpenTickets(s.size), () => {})
  }, [profile?.uid, role])

  // Auto-expand active module
  useEffect(() => {
    const seg = location.pathname.split('/')[1]
    if (seg) setExpanded(p => ({ ...p, [seg]: true }))
  }, [location.pathname])

  if (collapsed) return null

  return (
    <nav className="h-full overflow-y-auto py-4 px-2 space-y-0.5">
      {MODULES.map(mod => {
        // Role check
        if (mod.roles && !mod.roles.includes(role)) return null
        if (mod.perm  && !can(mod.perm))             return null

        const isBase = mod.base && location.pathname.startsWith(mod.base)

        if (!mod.children) {
          // Flat link
          return <NavItem key={mod.id} icon={mod.icon} label={mod.label} path={mod.path} end={mod.id === 'portal'} />
        }

        return (
          <div key={mod.id}>
            {/* Module header */}
            <button
              onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150',
                isBase ? 'font-semibold' : 'font-medium opacity-70 hover:opacity-100 hover:bg-[var(--bg-hover)]'
              )}
              style={{ color: isBase ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <mod.icon size={13} className="flex-shrink-0" />
              <span className="flex-1 text-left">{mod.label}</span>
              {mod.id === 'itsm' && openTickets > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{openTickets > 99 ? '99+' : openTickets}</span>
              )}
              <ChevronRight size={11} style={{ transform: expanded[mod.id] ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
            </button>

            {/* Children */}
            {expanded[mod.id] && (
              <div className="ml-3 pl-2 mt-0.5 space-y-0.5" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                {mod.children
                  .filter(c => !c.perm || can(c.perm))
                  .map(c => <NavItem key={c.path + (c.q ? JSON.stringify(c.q) : '')} icon={c.icon} label={c.label} path={c.path} end={c.end} />)
                }
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
