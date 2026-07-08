import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

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
      <main className="pantalla-login">
        <div className="tarjeta-login">
          <h1>Cuenta creada</h1>
          <p>
            Revisa tu correo si se requiere confirmación. Luego, un
            administrador debe activar tu cuenta para que puedas entrar.
          </p>
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla-login">
      <form className="tarjeta-login" onSubmit={handleSubmit}>
        <h1>Crear cuenta</h1>
        <p className="subtitulo">Regístrate como relator de formación WOM</p>

        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p role="alert" className="mensaje-error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="subtitulo">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </main>
  )
}
