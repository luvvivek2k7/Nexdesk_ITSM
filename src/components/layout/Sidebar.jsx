// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Sidebar (FIXED — persona-aware nav per module)
// ─────────────────────────────────────────────────────────────────────────────
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, Clock, BookOpen, ShoppingBag,
  AlertTriangle, GitBranch, Package, RefreshCw, BarChart3,
  Users, Settings, Shield, ChevronRight, Workflow,
  MonitorDot, Database, Lock, Map, Building2, Bell,
  Wrench, FileText, Star, Home,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLES, PERMISSIONS } from '@/lib/constants'
import clsx from 'clsx'

// ── Nav config keyed by url prefix ──────────────────────────────────────────
function getSidebarConfig(base, role) {
  const isAdmin   = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(role)
  const isAgent   = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT].includes(role)
  const isMgr     = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER].includes(role)
  const isSuper   = role === ROLES.SUPER_ADMIN

  const configs = {
    '/portal': {
      title: 'Portal', subtitle: 'Digital Workplace Hub',
      sections: [{
        items: [
          { path:'/portal',           label:'Home',            icon:Home         },
          { path:'/itsm/catalog',     label:'Service Catalog', icon:ShoppingBag  },
          { path:'/itsm/knowledge',   label:'Knowledge Base',  icon:BookOpen     },
          { path:'/itsm/tickets',     label:'My Tickets',      icon:Ticket, badge:true },
          { path:'/notifications',    label:'Notifications',   icon:Bell         },
        ],
      }],
    },

    '/itsm': {
      title: 'ITSM', subtitle: 'IT Service Management',
      sections: [
        {
          label: 'Operations',
          items: [
            { path:'/itsm/dashboard',            label:'Dashboard',       icon:LayoutDashboard, show:true        },
            { path:'/itsm/tickets',              label:'All Tickets',     icon:Ticket,   badge:true, show:isAgent },
            { path:'/itsm/tickets?type=INCIDENT',label:'Incidents',       icon:AlertTriangle,   show:isAgent     },
            { path:'/itsm/tickets?type=PROBLEM', label:'Problems',        icon:RefreshCw,       show:isAgent     },
            { path:'/itsm/tickets?type=CHANGE',  label:'Changes',         icon:GitBranch,       show:isAgent     },
            { path:'/itsm/tickets?type=SERVICE_REQUEST',label:'Requests', icon:Package,         show:true        },
          ],
        },
        {
          label: 'Management',
          items: [
            { path:'/itsm/sla',       label:'SLA Management',  icon:Clock,       show:isAgent },
            { path:'/itsm/workflow',  label:'Workflow Engine',  icon:Workflow,    show:isAdmin },
            { path:'/itsm/catalog',   label:'Service Catalog',  icon:ShoppingBag, show:true   },
            { path:'/itsm/knowledge', label:'Knowledge Base',   icon:BookOpen,    show:true   },
            { path:'/itsm/reports',   label:'Reports',          icon:BarChart3,   show:isMgr  },
          ],
        },
      ],
    },

    '/itam': {
      title: 'ITAM', subtitle: 'IT Asset Management',
      sections: [{
        label: 'Assets',
        items: [
          { path:'/itam/dashboard',   label:'Asset Dashboard', icon:LayoutDashboard, show:true  },
          { path:'/itam/inventory',   label:'All Assets',       icon:Database,         show:true  },
          { path:'/itam/cmdb',        label:'CMDB Relations',   icon:MonitorDot,       show:isAgent},
          { path:'/itam/lifecycle',   label:'Lifecycle',        icon:RefreshCw,        show:isAgent},
          { path:'/itam/compliance',  label:'Compliance',       icon:Shield,           show:isMgr  },
          { path:'/itam/reports',     label:'Reports',          icon:BarChart3,        show:isMgr  },
        ],
      }],
    },

    '/iam': {
      title: 'IAM', subtitle: 'Identity & Access',
      sections: [{
        label: 'Access Governance',
        items: [
          { path:'/iam/dashboard',    label:'Overview',         icon:LayoutDashboard, show:true  },
          { path:'/iam/requests',     label:'Access Requests',  icon:Lock,    badge:true, show:true  },
          { path:'/iam/approvals',    label:'Approvals',        icon:Shield,           show:isMgr  },
          { path:'/iam/review',       label:'Access Review',    icon:FileText,         show:isAdmin},
          { path:'/iam/compliance',   label:'Compliance',       icon:Shield,           show:isAdmin},
        ],
      }],
    },

    '/hrms': {
      title: 'HRMS', subtitle: 'HR Management',
      sections: [{
        label: 'People',
        items: [
          { path:'/hrms/dashboard',   label:'HR Dashboard',    icon:LayoutDashboard, show:true },
          { path:'/hrms/employees',   label:'Employees',       icon:Users,           show:true },
          { path:'/hrms/onboarding',  label:'Onboarding',      icon:Star,            show:true },
          { path:'/hrms/leave',       label:'Leave & Attend.', icon:Clock,           show:true },
          { path:'/hrms/performance', label:'Performance',     icon:BarChart3,       show:isMgr},
        ],
      }],
    },

    '/fso': {
      title: 'FSO', subtitle: 'Field Services',
      sections: [{
        label: 'Field Operations',
        items: [
          { path:'/fso/dashboard',    label:'Command Center',  icon:LayoutDashboard, show:true  },
          { path:'/fso/workorders',   label:'Work Orders',     icon:Ticket, badge:true, show:true },
          { path:'/fso/engineers',    label:'Engineers',       icon:Wrench,          show:isMgr  },
          { path:'/fso/dispatch',     label:'Dispatch',        icon:Map,             show:isAgent},
          { path:'/fso/reports',      label:'Reports',         icon:BarChart3,       show:isMgr  },
        ],
      }],
    },

    '/visitor': {
      title: 'Visitor Mgmt', subtitle: 'Premises & Access',
      sections: [{
        label: 'Visitor Management',
        items: [
          { path:'/visitor/dashboard', label:'Live Overview',  icon:LayoutDashboard, show:true  },
          { path:'/visitor/register',  label:'Pre-Register',   icon:Users,           show:true  },
          { path:'/visitor/workflow',  label:'Check-In Flow',  icon:Workflow,        show:isAgent},
          { path:'/visitor/access',    label:'Physical Access',icon:Building2,       show:isAdmin},
          { path:'/visitor/analytics', label:'Analytics',      icon:BarChart3,       show:isMgr  },
        ],
      }],
    },

    '/admin': {
      title: 'Administration', subtitle: 'Platform Management',
      sections: [{
        label: 'Admin',
        items: [
          { path:'/admin/users',    label:'Users',           icon:Users,    show:isAdmin   },
          { path:'/admin/roles',    label:'Roles & Perms',   icon:Shield,   show:isAdmin   },
          { path:'/admin/settings', label:'System Settings', icon:Settings, show:isAdmin   },
          { path:'/admin/workflow', label:'Workflow Builder', icon:Workflow, show:isSuper   },
          { path:'/admin/audit',    label:'Audit Log',        icon:FileText, show:isAdmin   },
        ],
      }],
    },
  }

  return configs[base] ?? configs['/portal']
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { role } = useAuth()

  const base    = '/' + location.pathname.split('/')[1]
  const config  = getSidebarConfig(base, role)

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
        background:  'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
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

            {section.items
              .filter(item => item.show !== false)
              .map((item) => {
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
                    {item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white min-w-[18px] text-center">
                        !
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
          NexDesk v1.0 · Phase 1 Live
        </p>
      </div>
    </div>
  )
}
