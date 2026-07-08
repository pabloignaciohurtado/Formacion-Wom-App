import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Panel from './pages/Panel'
import Ejercicios from './pages/Ejercicios'
import Practica from './pages/Practica'
import Consultas from './pages/Consultas'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
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
