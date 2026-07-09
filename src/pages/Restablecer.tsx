import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'

export default function Restablecer() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (loading) {
    return <p className="estado-carga">Cargando…</p>
  }

  // El enlace del correo abre esta página ya con la sesión de recuperación.
  if (!session) {
    return (
      <main className="pantalla-login">
        <div className="tarjeta-login">
          <h1>Enlace inválido o expirado</h1>
          <p>
            Este enlace de recuperación ya no es válido. Solicita uno nuevo y
            úsalo apenas llegue a tu correo.
          </p>
          <Link className="boton-enlace" to="/recuperar">
            Solicitar nuevo enlace
          </Link>
        </div>
      </main>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden')
      return
    }
    setGuardando(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setGuardando(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <main className="pantalla-login">
      <form className="tarjeta-login" onSubmit={handleSubmit}>
        <h1>Nueva contraseña</h1>
        <p className="subtitulo">
          Define la nueva contraseña para {session.user.email}
        </p>

        <label htmlFor="password">Nueva contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label htmlFor="confirmacion">Repite la contraseña</label>
        <input
          id="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
        />

        {error && <p role="alert" className="mensaje-error">{error}</p>}

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  )
}
