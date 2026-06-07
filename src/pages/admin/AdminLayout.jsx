// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Admin Layout
// Role guard only. Sidebar nav is handled by Sidebar.jsx automatically.
// ─────────────────────────────────────────────────────────────────────────────
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth }          from '@/context/AuthContext'
import { ROLES }            from '@/lib/constants'

export default function AdminLayout() {
  const { profile, loading } = useAuth()

  // Wait for profile to load before checking role
  if (loading) return null

  if (![ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(profile?.role)) {
    return <Navigate to="/portal" replace />
  }

  return <Outlet />
}
