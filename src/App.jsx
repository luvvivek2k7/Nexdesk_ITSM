// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App Router  v2.0
// Phase 2: ITAM, Reports, Workflow, real AI Chatbot
// ─────────────────────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

// Auth
import LoginPage from '@/pages/LoginPage'
import Protected from '@/components/layout/Protected'
import AppShell  from '@/components/layout/AppShell'

// Portal
import PortalPage from '@/pages/PortalPage'

// ITSM
import ITSMLayout      from '@/pages/itsm/ITSMLayout'
import ITSMDashboard   from '@/pages/itsm/ITSMDashboard'
import TicketListPage  from '@/pages/itsm/TicketListPage'
import NewTicketPage   from '@/pages/itsm/NewTicketPage'
import TicketDetailPage from '@/pages/itsm/TicketDetailPage'
import SLADashboard    from '@/pages/itsm/SLADashboard'
import KnowledgePage   from '@/pages/itsm/KnowledgePage'
import ServiceCatalog  from '@/pages/itsm/ServiceCatalog'

// ITAM  (Phase 2)
import ITAMLayout      from '@/pages/itam/ITAMLayout'
import ITAMDashboard   from '@/pages/itam/ITAMDashboard'
import AssetListPage   from '@/pages/itam/AssetListPage'
import AssetFormPage   from '@/pages/itam/AssetFormPage'
import AssetDetailPage from '@/pages/itam/AssetDetailPage'

// Reports (Phase 2)
import ReportsPage from '@/pages/reports/ReportsPage'

// Admin
import AdminLayout   from '@/pages/admin/AdminLayout'
import UsersPage     from '@/pages/admin/UsersPage'
import RolesPage     from '@/pages/admin/RolesPage'
import SettingsPage  from '@/pages/admin/SettingsPage'
import WorkflowPage  from '@/pages/admin/WorkflowPage'

// User
import ProfilePage from '@/pages/user/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Toaster position="top-right" toastOptions={{
            style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontSize: 13 },
          }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Protected><AppShell /></Protected>}>
              {/* Default redirect */}
              <Route index element={<Navigate to="/portal" replace />} />

              {/* Portal */}
              <Route path="portal" element={<PortalPage />} />

              {/* ITSM */}
              <Route path="itsm" element={<ITSMLayout />}>
                <Route index element={<ITSMDashboard />} />
                <Route path="tickets" element={<TicketListPage />} />
                <Route path="tickets/new" element={<NewTicketPage />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />
                <Route path="sla" element={<SLADashboard />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="catalog" element={<ServiceCatalog />} />
              </Route>

              {/* ITAM (Phase 2) */}
              <Route path="itam" element={<ITAMLayout />}>
                <Route index element={<ITAMDashboard />} />
                <Route path="assets" element={<AssetListPage />} />
                <Route path="assets/new" element={<AssetFormPage />} />
                <Route path="assets/:id" element={<AssetDetailPage />} />
                <Route path="assets/:id/edit" element={<AssetFormPage />} />
              </Route>

              {/* Reports (Phase 2) */}
              <Route path="reports" element={
                <Protected requiredRoles={['super_admin','it_admin','manager','it_agent']}>
                  <ReportsPage />
                </Protected>
              } />

              {/* Admin */}
              <Route path="admin" element={
                <Protected requiredRoles={['super_admin','it_admin']}>
                  <AdminLayout />
                </Protected>
              }>
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users"     element={<UsersPage />} />
                <Route path="roles"     element={<RolesPage />} />
                <Route path="workflows" element={<WorkflowPage />} />
                <Route path="settings"  element={<SettingsPage />} />
              </Route>

              {/* User */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
