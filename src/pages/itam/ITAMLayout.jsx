import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function ITAMLayout() {
  const { profile } = useAuth()
  const allowed = ['super_admin','it_admin','it_agent','manager']
  if (!allowed.includes(profile?.role)) return <Navigate to="/portal" replace />
  return <Outlet />
}
