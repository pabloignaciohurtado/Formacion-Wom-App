import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { m, useReducedMotion } from 'motion/react'
import { EASE_OUT } from '../lib/motion'
import {
  LayoutDashboard,
  Trophy,
  Dumbbell,
  ClipboardCheck,
  MessageCircleQuestion,
  ShieldCheck,
  Users,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { sincronizarOffline } from '../lib/colaOffline'
import { etiquetaRol } from '../lib/roles'
import { MarcaWom } from './MarcaWom'
import { EstadoCarga } from './ui'
import { ErrorBoundary } from './ErrorBoundary'
import { EstadoConexion } from './EstadoConexion'
import { BuscadorGlobal } from './BuscadorGlobal'

const enlaces = [
  { a: '/', texto: 'Panel', Icono: LayoutDashboard, exacto: true },
  { a: '/ejercicios', texto: 'Ejercicios', Icono: Dumbbell },
  { a: '/liga', texto: 'Liga', Icono: Trophy },
  { a: '/actividades', texto: 'Actividades', Icono: ClipboardCheck },
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
  const location = useLocation()
  const reduce = useReducedMotion()
  const [oscuro, setOscuro] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const alternarTema = () => {
    const nuevo = !oscuro
    setOscuro(nuevo)
    document.documentElement.classList.toggle('dark', nuevo)
    window.localStorage.setItem('tema', nuevo ? 'oscuro' : 'claro')
  }

  // Sincroniza intentos hechos sin conexión al montar y al volver la red
  useEffect(() => {
    void sincronizarOffline()
    const alVolver = () => void sincronizarOffline()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [])
  const esAdmin = perfil?.role === 'admin'
  // El admin ya tiene todo en Administración; Equipo es la puerta del supervisor.
  const esSupervisor = perfil?.role === 'supervisor'
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
          {esSupervisor && (
            <NavLink to="/equipo">
              {({ isActive }) => (
                <span className={clasesNav(isActive)}>
                  <Users className="size-5" />
                  Equipo
                </span>
              )}
            </NavLink>
          )}
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
        <BuscadorGlobal />
        <div className="flex items-center gap-3">
          <EstadoConexion />
          <button
            type="button"
            onClick={alternarTema}
            aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-niebla"
          >
            {oscuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-semibold">{perfil?.nombre ?? user?.email}</p>
            <p className="text-xs text-tinta-suave">
              {etiquetaRol(perfil?.role)}
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

      {/* Contenido con transición entre páginas */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:pb-10">
        <m.div
          key={location.pathname}
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {/* El Suspense va dentro del Layout para que el chrome (barra lateral,
              cabecera) no se desmonte mientras llega el chunk de la página.
              El ErrorBoundary lo envuelve porque un fallo dentro de una página
              no debe llevarse la navegación por delante; la `key` lo remonta al
              cambiar de ruta, así el error se limpia y quien practica no queda
              encerrado en una pantalla muerta. */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<EstadoCarga />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </m.div>
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
        {esSupervisor && (
          <NavLink to="/equipo">
            {({ isActive }) => (
              <span className={clasesNav(isActive, true)}>
                <Users className="size-5" />
                Equipo
              </span>
            )}
          </NavLink>
        )}
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
