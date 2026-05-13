// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Protected Route Wrapper
// Redirects to /login if not authenticated
// Redirects to /portal if role not in requiredRoles
// ─────────────────────────────────────────────────────────────────────────────
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/shared/index.jsx'

export default function Protected({ children, requiredRoles }) {
  const { user, loading, profile } = useAuth()
  const location = useLocation()

  // Still loading auth state — show spinner
  if (loading) return <LoadingScreen />

  // Not logged in — redirect to login, preserving intended destination
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Role check — if requiredRoles specified and user role not in list
  if (requiredRoles && profile?.role && !requiredRoles.includes(profile.role)) {
    return <Navigate to="/portal" replace />
  }

  return children
}
