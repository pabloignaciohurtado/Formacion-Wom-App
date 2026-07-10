import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { domAnimation, LazyMotion } from 'motion/react'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { SupervisorRoute } from './auth/SupervisorRoute'
import { Layout } from './components/Layout'
import { EstadoCarga } from './components/ui'
import Login from './pages/Login'

// Login viaja en el bundle inicial: es la primera pantalla de casi todas las
// visitas y no debe costar una petición extra. El resto llega bajo demanda,
// cuando el router lo necesita.
//
// Esto no reduce lo que el navegador descarga en total —el service worker
// precachea todos los chunks— pero sí lo que tiene que analizar y ejecutar
// antes de pintar. Los 50 KB del catálogo de ejercicios y las páginas de
// administración dejan de estar en la ruta crítica de un relator.
const Registro = lazy(() => import('./pages/Registro'))
const Recuperar = lazy(() => import('./pages/Recuperar'))
const Restablecer = lazy(() => import('./pages/Restablecer'))
const Panel = lazy(() => import('./pages/Panel'))
const Ejercicios = lazy(() => import('./pages/Ejercicios'))
const Practica = lazy(() => import('./pages/Practica'))
const Actividades = lazy(() => import('./pages/Actividades'))
const Consultas = lazy(() => import('./pages/Consultas'))
const Admin = lazy(() => import('./pages/Admin'))
const Equipo = lazy(() => import('./pages/Equipo'))
const FichaRelator = lazy(() => import('./pages/FichaRelator'))

// En GitHub Pages la app se sirve bajo /Formacion-Wom-App/; BASE_URL la
// define vite build --base=… ('/' en desarrollo).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <AuthProvider>
      {/* domAnimation trae animaciones, gestos y AnimatePresence, y deja fuera
          las animaciones de layout y el arrastre, que esta app no usa. `strict`
          hace que un <motion.div> olvidado lance error en vez de recargar el
          runtime completo por la puerta de atrás. */}
      <LazyMotion features={domAnimation} strict>
        <BrowserRouter basename={basename}>
          {/* Este Suspense cubre las páginas de autenticación, que no viven
              dentro del Layout. Las de dentro tienen el suyo propio. */}
          <Suspense fallback={<EstadoCarga />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/recuperar" element={<Recuperar />} />
              <Route path="/restablecer" element={<Restablecer />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Panel />} />
                  <Route path="/ejercicios" element={<Ejercicios />} />
                  <Route path="/ejercicios/:dominioId" element={<Practica />} />
                  <Route path="/actividades" element={<Actividades />} />
                  <Route path="/consultas" element={<Consultas />} />
                  <Route element={<SupervisorRoute />}>
                    <Route path="/equipo" element={<Equipo />} />
                  </Route>
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/relator/:id" element={<FichaRelator />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LazyMotion>
    </AuthProvider>
  )
}
