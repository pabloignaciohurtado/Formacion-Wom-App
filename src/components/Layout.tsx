import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  MessageCircleQuestion,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { MarcaWom } from './MarcaWom'

const enlaces = [
  { a: '/', texto: 'Panel', Icono: LayoutDashboard, exacto: true },
  { a: '/ejercicios', texto: 'Ejercicios', Icono: Dumbbell },
  { a: '/consultas', texto: 'Consultas', Icono: MessageCircleQuestion },
]

function clasesNav(activo: boolean, movil = false) {
  const base = movil
    ? 'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors'
    : 'flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium transition-colors'
  return activo
    ? `${base} ${movil ? 'text-magenta-500' : 'bg-white/10 text-white'}`
    : `${base} ${movil ? 'text-tinta-suave' : 'text-wom-100 hover:bg-white/5 hover:text-white'}`
}

export function Layout() {
  const { perfil, user, signOut } = useAuth()
  const esAdmin = perfil?.role === 'admin'
  const iniciales = (perfil?.nombre ?? user?.email ?? '?')
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-wom-900 to-wom-700 p-5 lg:flex">
        <div className="mb-10">
          <MarcaWom clara />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {enlaces.map(({ a, texto, Icono, exacto }) => (
            <NavLink key={a} to={a} end={exacto}>
              {({ isActive }) => (
                <span className={clasesNav(isActive)}>
                  <Icono className="size-5" />
                  {texto}
                </span>
              )}
            </NavLink>
          ))}
          {esAdmin && (
            <NavLink to="/admin">
              {({ isActive }) => (
                <span className={clasesNav(isActive)}>
                  <ShieldCheck className="size-5" />
                  Administración
                </span>
              )}
            </NavLink>
          )}
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-wom-100 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-5" />
          Cerrar sesión
        </button>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
        <div className="lg:hidden">
          <MarcaWom />
        </div>
        <div className="hidden lg:block text-sm text-tinta-suave">
          Plataforma de formación interna
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-semibold">{perfil?.nombre ?? user?.email}</p>
            <p className="text-xs text-tinta-suave">
              {esAdmin ? 'Administrador' : 'Relator'}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-wom-600 font-bold text-white">
            {iniciales}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="lg:hidden text-tinta-suave"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      {/* Bottom nav móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-black/5 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        {enlaces.map(({ a, texto, Icono, exacto }) => (
          <NavLink key={a} to={a} end={exacto}>
            {({ isActive }) => (
              <span className={clasesNav(isActive, true)}>
                <Icono className="size-5" />
                {texto}
              </span>
            )}
          </NavLink>
        ))}
        {esAdmin && (
          <NavLink to="/admin">
            {({ isActive }) => (
              <span className={clasesNav(isActive, true)}>
                <ShieldCheck className="size-5" />
                Admin
              </span>
            )}
          </NavLink>
        )}
      </nav>
    </div>
  )
}
