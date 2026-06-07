// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Roles & Permissions Page
// Visual permission matrix for all personas
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react'
import { Check, X } from 'lucide-react'
import { ROLES, ROLE_META, PERMISSIONS } from '@/lib/constants'
import { Card, CardHeader, Badge } from '@/components/shared/index.jsx'

// Group permissions for display
const PERMISSION_GROUPS = [
  {
    label: 'Tickets',
    perms: [
      { key: 'VIEW_ALL_TICKETS',  label: 'View all tickets'   },
      { key: 'CREATE_TICKET',     label: 'Create tickets'      },
      { key: 'EDIT_ANY_TICKET',   label: 'Edit any ticket'     },
      { key: 'DELETE_TICKET',     label: 'Delete tickets'      },
      { key: 'ASSIGN_TICKET',     label: 'Assign tickets'      },
      { key: 'CLOSE_TICKET',      label: 'Close tickets'       },
      { key: 'APPROVE_TICKET',    label: 'Approve tickets'     },
    ],
  },
  {
    label: 'SLA',
    perms: [
      { key: 'MANAGE_SLA',         label: 'Manage SLA policies' },
      { key: 'VIEW_SLA_DASHBOARD', label: 'View SLA dashboard'  },
    ],
  },
  {
    label: 'Users & Admin',
    perms: [
      { key: 'MANAGE_USERS',       label: 'Manage users'        },
      { key: 'VIEW_USERS',         label: 'View users'          },
      { key: 'ASSIGN_ROLES',       label: 'Assign roles'        },
      { key: 'ACCESS_ADMIN_PANEL', label: 'Admin panel access'  },
      { key: 'MANAGE_SETTINGS',    label: 'Manage settings'     },
    ],
  },
  {
    label: 'Reports',
    perms: [
      { key: 'VIEW_ALL_REPORTS',  label: 'All reports'         },
      { key: 'VIEW_TEAM_REPORTS', label: 'Team reports'        },
    ],
  },
  {
    label: 'Modules',
    perms: [
      { key: 'ACCESS_ITAM',    label: 'ITAM module'    },
      { key: 'ACCESS_IAM',     label: 'IAM module'     },
      { key: 'ACCESS_HRMS',    label: 'HRMS module'    },
      { key: 'ACCESS_FSO',     label: 'FSO module'     },
      { key: 'ACCESS_VISITOR', label: 'Visitor module' },
    ],
  },
]

const ROLE_ORDER = [
  ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT,
  ROLES.MANAGER, ROLES.DEVELOPER, ROLES.HR, ROLES.FIELD_ENGINEER, ROLES.USER,
]

export default function RolesPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Roles &amp; Permissions
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Full permission matrix across all {ROLE_ORDER.length} personas
        </p>
      </div>

      {/* Persona cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLE_ORDER.map(role => {
          const meta = ROLE_META[role]
          return (
            <div
              key={role}
              className="rounded-xl p-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="text-xl mb-1.5">
                {role === ROLES.SUPER_ADMIN    ? '👑'
                : role === ROLES.IT_ADMIN      ? '⚙️'
                : role === ROLES.IT_AGENT      ? '🎧'
                : role === ROLES.MANAGER       ? '📋'
                : role === ROLES.DEVELOPER     ? '💻'
                : role === ROLES.HR            ? '🧑‍💼'
                : role === ROLES.FIELD_ENGINEER? '🔧'
                : '👤'}
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {meta.label}
              </p>
              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                {meta.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Permission matrix */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider sticky left-0 z-10"
                  style={{
                    color: 'var(--text-muted)',
                    background: 'var(--bg-surface)',
                    minWidth: 180,
                  }}
                >
                  Permission
                </th>
                {ROLE_ORDER.map(role => (
                  <th
                    key={role}
                    className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', minWidth: 80 }}
                  >
                    {ROLE_META[role]?.label.split(' ').pop()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => (
                <React.Fragment key={group.label}>
                  {/* Group header */}
                  <tr>
                    <td
                      colSpan={ROLE_ORDER.length + 1}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      {group.label}
                    </td>
                  </tr>

                  {/* Permission rows */}
                  {group.perms.map(({ key, label }) => (
                    <tr
                      key={key}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td
                        className="px-4 py-2.5 text-xs sticky left-0"
                        style={{
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-surface)',
                        }}
                      >
                        {label}
                      </td>
                      {ROLE_ORDER.map(role => {
                        const allowed = (PERMISSIONS[key] ?? []).includes(role)
                        return (
                          <td key={role} className="px-3 py-2.5 text-center">
                            {allowed
                              ? <Check
                                  size={14}
                                  className="mx-auto"
                                  style={{ color: 'var(--success)' }}
                                />
                              : <X
                                  size={14}
                                  className="mx-auto opacity-20"
                                  style={{ color: 'var(--text-muted)' }}
                                />
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Note */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          color: 'var(--text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--accent)' }}>Role Assignment:</strong> Only a Super Admin can change user roles.
        Go to <strong>Admin → Users</strong> and use the role dropdown on any user row.
        The first user to sign in with Google is automatically assigned Super Admin.
      </div>
    </div>
  )
}
