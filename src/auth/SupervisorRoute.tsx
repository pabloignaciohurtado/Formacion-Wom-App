import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { puedeAsignar } from '../lib/roles'

// Rutas de quien asigna formación: supervisores y admins. ProtectedRoute ya
// esperó la carga del perfil, así que aquí decidir es inmediato.
export function SupervisorRoute() {
  const { perfil } = useAuth()

  if (!puedeAsignar(perfil?.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
