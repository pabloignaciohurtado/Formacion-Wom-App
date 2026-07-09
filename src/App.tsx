import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Recuperar from './pages/Recuperar'
import Restablecer from './pages/Restablecer'
import Panel from './pages/Panel'
import Ejercicios from './pages/Ejercicios'
import Practica from './pages/Practica'
import Consultas from './pages/Consultas'
import Admin from './pages/Admin'

// En GitHub Pages la app se sirve bajo /Formacion-Wom-App/; BASE_URL la
// define vite build --base=… ('/' en desarrollo y en Vercel).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
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
              <Route path="/consultas" element={<Consultas />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
