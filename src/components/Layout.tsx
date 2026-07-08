import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Layout() {
  const { perfil, user, signOut } = useAuth()

  return (
    <div className="app">
      <header className="barra-superior">
        <div className="zona-izquierda">
          <span className="marca">Formación WOM</span>
          <nav className="navegacion">
            <NavLink to="/" end>
              Panel
            </NavLink>
            <NavLink to="/consultas">Consultas</NavLink>
            {perfil?.role === 'admin' && (
              <NavLink to="/admin">Administración</NavLink>
            )}
          </nav>
        </div>
        <div className="sesion">
          <span>
            {perfil?.nombre ?? user?.email}
            {perfil?.role === 'admin' && (
              <span className="insignia-admin">admin</span>
            )}
          </span>
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
