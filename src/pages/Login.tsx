import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Boton, Campo, MensajeError, Tarjeta } from '../components/ui'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    const { error: signInError } = await signIn(email, password)
    setEnviando(false)
    if (signInError) {
      setError(signInError)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout>
      <Tarjeta className="p-8">
        <h1 className="text-2xl font-extrabold">Hola de nuevo 👋</h1>
        <p className="mb-6 mt-1 text-sm text-tinta-suave">
          Ingresa con tu cuenta para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Campo
            etiqueta="Correo electrónico"
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Campo
            etiqueta="Contraseña"
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <MensajeError>{error}</MensajeError>}

          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Boton>
        </form>

        <div className="mt-6 space-y-1 text-center text-sm text-tinta-suave">
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-wom-600 hover:underline">
              Regístrate
            </Link>
          </p>
          <p>
            <Link to="/recuperar" className="font-semibold text-wom-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </div>
      </Tarjeta>
    </AuthLayout>
  )
}
