// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App-wide Constants
// Single source of truth for roles, permissions, SLA, categories, statuses
// ─────────────────────────────────────────────────────────────────────────────

// ── PERSONA / ROLES ───────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:     'super_admin',
  IT_ADMIN:        'it_admin',
  IT_AGENT:        'it_agent',
  MANAGER:         'manager',
  DEVELOPER:       'developer',
  HR:              'hr',
  FIELD_ENGINEER:  'field_engineer',
  USER:            'user',
}

export const ROLE_META = {
  [ROLES.SUPER_ADMIN]:    { label: 'Super Admin',     icon: 'Crown',         color: 'violet', description: 'Full platform access & configuration' },
  [ROLES.IT_ADMIN]:       { label: 'IT Admin',        icon: 'Settings',      color: 'blue',   description: 'ITSM/ITAM config, SLA policies, reports' },
  [ROLES.IT_AGENT]:       { label: 'IT Agent',        icon: 'Headphones',    color: 'cyan',   description: 'Ticket queue, SLA timers, KB access' },
  [ROLES.MANAGER]:        { label: 'Manager',         icon: 'BarChart3',     color: 'green',  description: 'Team tickets, approvals, reports' },
  [ROLES.DEVELOPER]:      { label: 'Developer',       icon: 'Code2',         color: 'amber',  description: 'API access, webhooks, dev tools' },
  [ROLES.HR]:             { label: 'HR',              icon: 'Users',         color: 'pink',   description: 'HRMS module, onboarding, leave' },
  [ROLES.FIELD_ENGINEER]: { label: 'Field Engineer',  icon: 'Wrench',        color: 'orange', description: 'FSO module, work orders, dispatch' },
  [ROLES.USER]:           { label: 'Standard User',   icon: 'User',          color: 'gray',   description: 'Raise tickets, track, KB self-service' },
}

// ── PERMISSIONS ───────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Tickets
  VIEW_ALL_TICKETS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  CREATE_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER, ROLES.DEVELOPER, ROLES.HR, ROLES.USER, ROLES.FIELD_ENGINEER],
  EDIT_ANY_TICKET:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  DELETE_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  ASSIGN_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  CLOSE_TICKET:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
  APPROVE_TICKET:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  // SLA
  MANAGE_SLA:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  VIEW_SLA_DASHBOARD:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  // Users
  MANAGE_USERS:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  VIEW_USERS:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  ASSIGN_ROLES:        [ROLES.SUPER_ADMIN],
  // Reports
  VIEW_ALL_REPORTS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  VIEW_TEAM_REPORTS:   [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.IT_AGENT],
  // Admin
  ACCESS_ADMIN_PANEL:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  MANAGE_SETTINGS:     [ROLES.SUPER_ADMIN],
  // Modules
  ACCESS_ITAM:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
  ACCESS_IAM:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
  ACCESS_HRMS:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.HR],
  ACCESS_FSO:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.FIELD_ENGINEER],
  ACCESS_VISITOR:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
}

// ── SLA POLICIES ──────────────────────────────────────────────────────────────
export const SLA_POLICIES = {
  P1: {
    label:           'P1 — Critical',
    color:           'red',
    responseMinutes: 60,        // 1 hour
    resolutionHours: 4,
    escalationHours: 2,
    description:     'Complete system outage or security breach. Affects all users.',
  },
  P2: {
    label:           'P2 — High',
    color:           'orange',
    responseMinutes: 240,       // 4 hours
    resolutionHours: 8,
    escalationHours: 6,
    description:     'Major functionality impaired. Significant user impact.',
  },
  P3: {
    label:           'P3 — Medium',
    color:           'amber',
    responseMinutes: 480,       // 8 hours
    resolutionHours: 24,
    escalationHours: 16,
    description:     'Partial loss of function. Workaround available.',
  },
  P4: {
    label:           'P4 — Low',
    color:           'blue',
    responseMinutes: 1440,      // 24 hours
    resolutionHours: 72,
    escalationHours: 48,
    description:     'Minor issue or enhancement request. No business impact.',
  },
}

// ── TICKET STATUSES ───────────────────────────────────────────────────────────
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

// ── TICKET TYPES ──────────────────────────────────────────────────────────────
export const TICKET_TYPES = {
  INCIDENT:        { label: 'Incident',        icon: 'AlertTriangle', color: 'red'    },
  PROBLEM:         { label: 'Problem',          icon: 'Bug',           color: 'orange' },
  CHANGE:          { label: 'Change Request',   icon: 'GitBranch',     color: 'violet' },
  SERVICE_REQUEST: { label: 'Service Request',  icon: 'ShoppingBag',   color: 'blue'   },
  RELEASE:         { label: 'Release',          icon: 'Package',       color: 'green'  },
}

// ── TICKET CATEGORIES ──────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'hardware',       label: 'Hardware',          icon: '🖥',  group: 'IT'     },
  { id: 'software',       label: 'Software',          icon: '📦',  group: 'IT'     },
  { id: 'network',        label: 'Network',           icon: '📡',  group: 'IT'     },
  { id: 'access',         label: 'Access & Identity', icon: '🔐',  group: 'IT'     },
  { id: 'email',          label: 'Email & Calendar',  icon: '📧',  group: 'IT'     },
  { id: 'security',       label: 'Security',          icon: '🛡',  group: 'IT'     },
  { id: 'server',         label: 'Server / Cloud',    icon: '☁️',  group: 'IT'     },
  { id: 'database',       label: 'Database',          icon: '🗄',  group: 'IT'     },
  { id: 'hr',             label: 'HR Services',       icon: '👥',  group: 'HR'     },
  { id: 'finance',        label: 'Finance',           icon: '💰',  group: 'Biz'    },
  { id: 'facilities',     label: 'Facilities',        icon: '🏢',  group: 'Biz'    },
  { id: 'other',          label: 'Other',             icon: '❓',  group: 'Other'  },
]

// ── MODULES ───────────────────────────────────────────────────────────────────
export const MODULES = [
  { id: 'portal',   label: 'Portal',           icon: 'Home',        phase: 1, status: 'live'    },
  { id: 'itsm',     label: 'ITSM',             icon: 'Ticket',      phase: 1, status: 'live'    },
  { id: 'itam',     label: 'ITAM',             icon: 'Monitor',     phase: 2, status: 'planned' },
  { id: 'iam',      label: 'IAM',              icon: 'Shield',      phase: 2, status: 'planned' },
  { id: 'hrms',     label: 'HRMS',             icon: 'Users',       phase: 3, status: 'planned' },
  { id: 'fso',      label: 'Field Services',   icon: 'MapPin',      phase: 2, status: 'planned' },
  { id: 'visitor',  label: 'Visitor Mgmt',     icon: 'Building2',   phase: 2, status: 'planned' },
  { id: 'chatbot',  label: 'Chatbot',          icon: 'MessageCircle',phase: 3, status: 'planned'},
]

// ── THEME ─────────────────────────────────────────────────────────────────────
export const THEMES = {
  DARK:  'dark',
  LIGHT: 'light',
}

// ── NOTIFICATION TYPES ────────────────────────────────────────────────────────
export const NOTIF_TYPES = {
  SLA_BREACH:    { label: 'SLA Breach',     color: 'red',    icon: 'AlertTriangle' },
  SLA_RISK:      { label: 'SLA At Risk',    color: 'amber',  icon: 'Clock'         },
  TICKET_ASSIGNED: { label: 'Ticket Assigned', color: 'blue', icon: 'Ticket'       },
  TICKET_UPDATED:  { label: 'Ticket Updated',  color: 'cyan', icon: 'RefreshCw'    },
  APPROVAL_NEEDED: { label: 'Approval Needed', color: 'violet', icon: 'CheckCircle' },
  SYSTEM:          { label: 'System',           color: 'gray',  icon: 'Bell'         },
}

// ── AI CONFIG ─────────────────────────────────────────────────────────────────
export const AI_CONFIG = {
  model:       'claude-3-5-haiku-20241022', // cheap + fast for real-time
  maxTokens:   500,
  temperature: 0.3,
}

// ── APP META ──────────────────────────────────────────────────────────────────
export const APP_META = {
  name:        'NexDesk',
  fullName:    'NexDesk — Digital Workplace Hub',
  version:     '1.0.0',
  description: 'Unified ITSM, ITAM, IAM, HRMS and Field Services Platform',
}
