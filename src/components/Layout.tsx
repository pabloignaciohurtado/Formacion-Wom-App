import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="app">
      <header className="barra-superior">
        <span className="marca">Formación WOM</span>
        <div className="sesion">
          <span>{user?.email}</span>
          <button type="button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
