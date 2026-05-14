// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App Router (COMPLETE v2)
// All modules wired: ITSM, ITAM, IAM, HRMS, FSO, Visitor
// Protected routes with role guards
// ─────────────────────────────────────────────────────────────────────────────
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster }                  from 'react-hot-toast'
import { useAuth }                  from '@/context/AuthContext'
import { useTheme }                 from '@/context/ThemeContext'

// Shell
import AppShell      from '@/components/layout/AppShell'
import LoadingScreen from '@/components/shared/LoadingScreen'

// Public
import LoginPage from '@/pages/LoginPage'

// Portal
import PortalPage from '@/pages/PortalPage'

// ITSM
import ITSMLayout         from '@/pages/itsm/ITSMLayout'
import ITSMDashboard      from '@/pages/itsm/ITSMDashboard'
import TicketListPage     from '@/pages/itsm/TicketListPage'
import TicketDetailPage   from '@/pages/itsm/TicketDetailPage'
import NewTicketPage      from '@/pages/itsm/NewTicketPage'
import SLAManagementPage  from '@/pages/itsm/SLAManagementPage'
import ServiceCatalogPage from '@/pages/itsm/ServiceCatalogPage'
import KnowledgePage      from '@/pages/itsm/KnowledgePage'

// ITAM (Phase 2)
import ITAMDashboard from '@/pages/itam/ITAMDashboard'

// IAM (Phase 2)
import IAMDashboard from '@/pages/iam/IAMDashboard'

// HRMS (Phase 2)
import HRMSDashboard from '@/pages/hrms/HRMSDashboard'

// FSO (Phase 2)
import FSODashboard from '@/pages/fso/FSODashboard'

// Visitor (Phase 2)
import VisitorDashboard from '@/pages/visitor/VisitorDashboard'

// Admin
import AdminLayout  from '@/pages/admin/AdminLayout'
import UsersPage    from '@/pages/admin/UsersPage'
import RolesPage    from '@/pages/admin/RolesPage'
import SettingsPage from '@/pages/admin/SettingsPage'

// User
import ProfilePage       from '@/pages/user/ProfilePage'
import NotificationsPage from '@/pages/user/NotificationsPage'

import { ROLES } from '@/lib/constants'

// ── Route guard ───────────────────────────────────────────────────────────────
function Protected({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading)  return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (roles && profile?.role && !roles.includes(profile.role)) {
    return <Navigate to="/portal" replace />
  }
  return children
}

const ADMIN_ROLES   = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN]
const AGENT_ROLES   = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT]
const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER]
const HR_ROLES      = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.HR, ROLES.MANAGER]
const FSO_ROLES     = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.FIELD_ENGINEER, ROLES.MANAGER]

export default function App() {
  const { loading } = useAuth()
  const { isDark }  = useTheme()

  if (loading) return <LoadingScreen />

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDark ? '#101828' : '#ffffff',
            color:      isDark ? '#e8edf5' : '#0f1828',
            border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            fontSize:   '13px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary:'#22c55e', secondary:'#fff' } },
          error:   { iconTheme: { primary:'#ef4444', secondary:'#fff' } },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected shell ── */}
        <Route path="/" element={<Protected><AppShell /></Protected>}>
          <Route index element={<Navigate to="/portal" replace />} />

          {/* Portal */}
          <Route path="portal" element={<PortalPage />} />

          {/* ── ITSM ── */}
          <Route path="itsm" element={<ITSMLayout />}>
            <Route index        element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<ITSMDashboard />} />
            <Route path="tickets"     element={<TicketListPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="sla"         element={<Protected roles={AGENT_ROLES}><SLAManagementPage /></Protected>} />
            <Route path="catalog"     element={<ServiceCatalogPage />} />
            <Route path="knowledge"   element={<KnowledgePage />} />
          </Route>

          {/* ── ITAM (Phase 2) ── */}
          <Route path="itam/*" element={
            <Protected roles={[...AGENT_ROLES, ROLES.MANAGER]}>
              <ITAMDashboard />
            </Protected>
          } />

          {/* ── IAM (Phase 2) ── */}
          <Route path="iam/*" element={
            <Protected roles={[...ADMIN_ROLES, ROLES.MANAGER]}>
              <IAMDashboard />
            </Protected>
          } />

          {/* ── HRMS (Phase 2) ── */}
          <Route path="hrms/*" element={
            <Protected roles={HR_ROLES}>
              <HRMSDashboard />
            </Protected>
          } />

          {/* ── FSO (Phase 2) ── */}
          <Route path="fso/*" element={
            <Protected roles={FSO_ROLES}>
              <FSODashboard />
            </Protected>
          } />

          {/* ── Visitor (Phase 2) ── */}
          <Route path="visitor/*" element={
            <Protected roles={[...ADMIN_ROLES, ROLES.MANAGER]}>
              <VisitorDashboard />
            </Protected>
          } />

          {/* ── Admin ── */}
          <Route path="admin" element={
            <Protected roles={ADMIN_ROLES}><AdminLayout /></Protected>
          }>
            <Route index        element={<Navigate to="users" replace />} />
            <Route path="users"    element={<UsersPage />} />
            <Route path="roles"    element={<RolesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ── User ── */}
          <Route path="profile"       element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
      </Routes>
    </>
  )
}
