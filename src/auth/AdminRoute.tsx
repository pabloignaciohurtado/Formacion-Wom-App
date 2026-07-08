import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function AdminRoute() {
  const { perfil } = useAuth()

  if (perfil?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
