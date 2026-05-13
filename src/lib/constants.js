// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App-wide Constants  v2.0
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN:    'super_admin',
  IT_ADMIN:       'it_admin',
  IT_AGENT:       'it_agent',
  MANAGER:        'manager',
  DEVELOPER:      'developer',
  HR:             'hr',
  FIELD_ENGINEER: 'field_engineer',
  USER:           'user',
}

export const ROLE_META = {
  [ROLES.SUPER_ADMIN]:    { label: 'Super Admin',    icon: 'Crown',      color: 'violet', description: 'Full platform access & configuration' },
  [ROLES.IT_ADMIN]:       { label: 'IT Admin',       icon: 'Settings',   color: 'blue',   description: 'ITSM/ITAM config, SLA policies, reports' },
  [ROLES.IT_AGENT]:       { label: 'IT Agent',       icon: 'Headphones', color: 'cyan',   description: 'Ticket queue, SLA timers, KB access' },
  [ROLES.MANAGER]:        { label: 'Manager',        icon: 'BarChart3',  color: 'green',  description: 'Team tickets, approvals, reports' },
  [ROLES.DEVELOPER]:      { label: 'Developer',      icon: 'Code2',      color: 'amber',  description: 'API access, webhooks, dev tools' },
  [ROLES.HR]:             { label: 'HR',             icon: 'Users',      color: 'pink',   description: 'HRMS module, onboarding, leave' },
  [ROLES.FIELD_ENGINEER]: { label: 'Field Engineer', icon: 'Wrench',     color: 'orange', description: 'FSO module, work orders, dispatch' },
  [ROLES.USER]:           { label: 'Standard User',  icon: 'User',       color: 'gray',   description: 'Raise tickets, track, KB self-service' },
}

export const PERMISSIONS = {
  VIEW_ALL_TICKETS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  CREATE_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER, ROLES.DEVELOPER, ROLES.HR, ROLES.USER, ROLES.FIELD_ENGINEER],
  EDIT_ANY_TICKET:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  DELETE_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  ASSIGN_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  CLOSE_TICKET:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  APPROVE_TICKET:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  MANAGE_SLA:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  VIEW_SLA_DASHBOARD:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  MANAGE_USERS:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  VIEW_USERS:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  ASSIGN_ROLES:        [ROLES.SUPER_ADMIN],
  VIEW_ALL_REPORTS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  VIEW_TEAM_REPORTS:   [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.IT_AGENT],
  ACCESS_ADMIN_PANEL:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  MANAGE_SETTINGS:     [ROLES.SUPER_ADMIN],
  ACCESS_ITAM:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  MANAGE_ITAM:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  ACCESS_IAM:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  ACCESS_HRMS:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.HR],
  ACCESS_FSO:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.FIELD_ENGINEER],
  ACCESS_VISITOR:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  MANAGE_WORKFLOWS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  VIEW_REPORTS:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.IT_AGENT],
}

export const SLA_POLICIES = {
  P1: { label: 'P1 — Critical', color: 'red',   responseMinutes: 60,   resolutionHours: 4,  escalationHours: 2,  description: 'Complete system outage or security breach.' },
  P2: { label: 'P2 — High',     color: 'orange', responseMinutes: 240,  resolutionHours: 8,  escalationHours: 6,  description: 'Major functionality impaired.' },
  P3: { label: 'P3 — Medium',   color: 'amber',  responseMinutes: 480,  resolutionHours: 24, escalationHours: 16, description: 'Partial loss. Workaround available.' },
  P4: { label: 'P4 — Low',      color: 'blue',   responseMinutes: 1440, resolutionHours: 72, escalationHours: 48, description: 'Minor issue or enhancement.' },
}

export const TICKET_STATUS = {
  NEW:         { label: 'New',         color: 'violet', next: ['OPEN', 'ASSIGNED']              },
  OPEN:        { label: 'Open',        color: 'blue',   next: ['ASSIGNED', 'IN_PROGRESS']       },
  ASSIGNED:    { label: 'Assigned',    color: 'cyan',   next: ['IN_PROGRESS', 'ON_HOLD']        },
  IN_PROGRESS: { label: 'In Progress', color: 'amber',  next: ['ON_HOLD', 'RESOLVED', 'CLOSED'] },
  ON_HOLD:     { label: 'On Hold',     color: 'gray',   next: ['IN_PROGRESS', 'CLOSED']         },
  PENDING:     { label: 'Pending',     color: 'yellow', next: ['IN_PROGRESS', 'CLOSED']         },
  RESOLVED:    { label: 'Resolved',    color: 'green',  next: ['CLOSED', 'OPEN']                },
  CLOSED:      { label: 'Closed',      color: 'gray',   next: ['OPEN']                          },
  CANCELLED:   { label: 'Cancelled',   color: 'red',    next: []                                },
}

export const TICKET_TYPES = {
  INCIDENT:        { label: 'Incident',       icon: 'AlertTriangle', color: 'red'    },
  PROBLEM:         { label: 'Problem',         icon: 'Bug',           color: 'orange' },
  CHANGE:          { label: 'Change Request',  icon: 'GitBranch',     color: 'violet' },
  SERVICE_REQUEST: { label: 'Service Request', icon: 'ShoppingBag',   color: 'blue'   },
  RELEASE:         { label: 'Release',         icon: 'Package',       color: 'green'  },
}

export const CATEGORIES = [
  { id: 'hardware',   label: 'Hardware',          icon: '🖥',  group: 'IT'    },
  { id: 'software',   label: 'Software',          icon: '📦',  group: 'IT'    },
  { id: 'network',    label: 'Network',           icon: '📡',  group: 'IT'    },
  { id: 'access',     label: 'Access & Identity', icon: '🔐',  group: 'IT'    },
  { id: 'email',      label: 'Email & Calendar',  icon: '📧',  group: 'IT'    },
  { id: 'security',   label: 'Security',          icon: '🛡',  group: 'IT'    },
  { id: 'server',     label: 'Server / Cloud',    icon: '☁️',  group: 'IT'    },
  { id: 'database',   label: 'Database',          icon: '🗄',  group: 'IT'    },
  { id: 'hr',         label: 'HR Services',       icon: '👥',  group: 'HR'    },
  { id: 'finance',    label: 'Finance',           icon: '💰',  group: 'Biz'   },
  { id: 'facilities', label: 'Facilities',        icon: '🏢',  group: 'Biz'   },
  { id: 'other',      label: 'Other',             icon: '❓',  group: 'Other' },
]

// ── ITAM ──────────────────────────────────────────────────────────────────────
export const ASSET_TYPES = {
  LAPTOP:     { label: 'Laptop',        icon: '💻', category: 'Hardware' },
  DESKTOP:    { label: 'Desktop',       icon: '🖥', category: 'Hardware' },
  MOBILE:     { label: 'Mobile',        icon: '📱', category: 'Hardware' },
  TABLET:     { label: 'Tablet',        icon: '📟', category: 'Hardware' },
  PRINTER:    { label: 'Printer',       icon: '🖨', category: 'Hardware' },
  MONITOR:    { label: 'Monitor',       icon: '🖥', category: 'Hardware' },
  SERVER:     { label: 'Server',        icon: '🗄', category: 'Hardware' },
  NETWORK:    { label: 'Network Equip', icon: '📡', category: 'Hardware' },
  SOFTWARE:   { label: 'Software',      icon: '📦', category: 'Software' },
  LICENSE:    { label: 'License',       icon: '🔑', category: 'Software' },
  CLOUD:      { label: 'Cloud Service', icon: '☁️', category: 'Cloud'   },
  OTHER:      { label: 'Other',         icon: '❓', category: 'Other'   },
}

export const ASSET_STATUS = {
  ACTIVE:      { label: 'Active',       color: 'green'  },
  INACTIVE:    { label: 'Inactive',     color: 'gray'   },
  IN_REPAIR:   { label: 'In Repair',    color: 'amber'  },
  DISPOSED:    { label: 'Disposed',     color: 'red'    },
  RESERVED:    { label: 'Reserved',     color: 'violet' },
  IN_STORE:    { label: 'In Store',     color: 'blue'   },
  LOST:        { label: 'Lost/Stolen',  color: 'red'    },
}

export const MODULES = [
  { id: 'portal',  label: 'Portal',         icon: 'Home',          phase: 1, status: 'live'    },
  { id: 'itsm',    label: 'ITSM',           icon: 'Ticket',        phase: 1, status: 'live'    },
  { id: 'itam',    label: 'ITAM',           icon: 'Monitor',       phase: 2, status: 'live'    },
  { id: 'reports', label: 'Reports',        icon: 'BarChart3',     phase: 2, status: 'live'    },
  { id: 'iam',     label: 'IAM',            icon: 'Shield',        phase: 3, status: 'planned' },
  { id: 'hrms',    label: 'HRMS',           icon: 'Users',         phase: 3, status: 'planned' },
  { id: 'fso',     label: 'Field Services', icon: 'MapPin',        phase: 3, status: 'planned' },
  { id: 'visitor', label: 'Visitor Mgmt',   icon: 'Building2',     phase: 3, status: 'planned' },
]

export const THEMES = { DARK: 'dark', LIGHT: 'light' }

export const NOTIF_TYPES = {
  SLA_BREACH:      { label: 'SLA Breach',       color: 'red',    icon: 'AlertTriangle' },
  SLA_RISK:        { label: 'SLA At Risk',       color: 'amber',  icon: 'Clock'         },
  TICKET_ASSIGNED: { label: 'Ticket Assigned',   color: 'blue',   icon: 'Ticket'        },
  TICKET_UPDATED:  { label: 'Ticket Updated',    color: 'cyan',   icon: 'RefreshCw'     },
  APPROVAL_NEEDED: { label: 'Approval Needed',   color: 'violet', icon: 'CheckCircle'   },
  ASSET_EXPIRING:  { label: 'Asset/Lic Expiring',color: 'orange', icon: 'AlertTriangle' },
  SYSTEM:          { label: 'System',            color: 'gray',   icon: 'Bell'          },
}

export const APP_META = {
  name:        'NexDesk',
  fullName:    'NexDesk — Digital Workplace Hub',
  version:     '2.0.0',
  description: 'Unified ITSM, ITAM, IAM, HRMS and Field Services Platform',
}
