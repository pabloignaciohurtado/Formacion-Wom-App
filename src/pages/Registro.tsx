import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Boton, Campo, MensajeError, Tarjeta } from '../components/ui'

export default function Registro() {
  const { session, signUp } = useAuth()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [creada, setCreada] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    const { error: signUpError } = await signUp(nombre, email, password)
    setEnviando(false)
    if (signUpError) {
      setError(signUpError)
      return
    }
    setCreada(true)
  }

  if (creada) {
    return (
      <AuthLayout>
        <Tarjeta className="p-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-exito/15 text-3xl">
            🎉
          </div>
          <h1 className="text-2xl font-extrabold">Cuenta creada</h1>
          <p className="mt-2 text-sm text-tinta-suave">
            Revisa tu correo si se requiere confirmación. Luego, un
            administrador debe activar tu cuenta para que puedas entrar.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-semibold text-wom-600 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </Tarjeta>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Tarjeta className="p-8">
        <h1 className="text-2xl font-extrabold">Crear cuenta</h1>
        <p className="mb-6 mt-1 text-sm text-tinta-suave">
          Regístrate para la formación interna de WOM
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Campo
            etiqueta="Nombre"
            id="nombre"
            type="text"
            autoComplete="name"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <MensajeError>{error}</MensajeError>}

          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </Boton>
        </form>

        <p className="mt-6 text-center text-sm text-tinta-suave">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-wom-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Tarjeta>
    </AuthLayout>
  )
}
