// AdminLayout.jsx
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'
import { ROLES } from '@/lib/constants'

export default function AdminLayout() {
  const { profile } = useAuth()
  if (![ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(profile?.role)) {
    return <Navigate to="/portal" replace />
  }
  return <Outlet />
}
