// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App Router
// All routes defined here. Protected routes redirect to /login if not authed.
// ─────────────────────────────────────────────────────────────────────────────
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

// Layout
import AppShell     from '@/components/layout/AppShell'
import LoadingScreen from '@/components/shared/LoadingScreen'

// Public pages
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

// Admin
import AdminLayout     from '@/pages/admin/AdminLayout'
import UsersPage       from '@/pages/admin/UsersPage'
import SettingsPage    from '@/pages/admin/SettingsPage'
import RolesPage       from '@/pages/admin/RolesPage'

// User
import ProfilePage from '@/pages/user/ProfilePage'
import NotificationsPage from '@/pages/user/NotificationsPage'

// ── Protected route wrapper ───────────────────────────────────────────────────
function Protected({ children, requiredRoles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />
  if (requiredRoles && !requiredRoles.includes(profile?.role)) {
    return <Navigate to="/portal" replace />
  }
  return children
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { loading } = useAuth()
  const { isDark }  = useTheme()

  if (loading) return <LoadingScreen />

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDark ? '#101828' : '#ffffff',
            color:      isDark ? '#e8edf5' : '#0f1828',
            border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            fontSize:   '13px',
          },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected shell */}
        <Route path="/" element={<Protected><AppShell /></Protected>}>
          <Route index element={<Navigate to="/portal" replace />} />

          {/* Portal */}
          <Route path="portal" element={<PortalPage />} />

          {/* ITSM */}
          <Route path="itsm" element={<ITSMLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<ITSMDashboard />} />
            <Route path="tickets"       element={<TicketListPage />} />
            <Route path="tickets/new"   element={<NewTicketPage />} />
            <Route path="tickets/:id"   element={<TicketDetailPage />} />
            <Route path="sla"           element={<SLAManagementPage />} />
            <Route path="catalog"       element={<ServiceCatalogPage />} />
            <Route path="knowledge"     element={<KnowledgePage />} />
          </Route>

          {/* Admin */}
          <Route path="admin" element={<Protected><AdminLayout /></Protected>}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users"    element={<UsersPage />} />
            <Route path="roles"    element={<RolesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* User */}
          <Route path="profile"       element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
      </Routes>
    </>
  )
}
