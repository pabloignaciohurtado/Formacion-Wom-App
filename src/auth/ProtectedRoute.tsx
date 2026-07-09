import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { EstadoCarga } from '../components/ui'
import CuentaInactiva from '../pages/CuentaInactiva'

export function ProtectedRoute() {
  const { session, perfil, loading } = useAuth()

  if (loading) {
    return <EstadoCarga />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!perfil || !perfil.activo) {
    return <CuentaInactiva />
  }

  return <Outlet />
}
