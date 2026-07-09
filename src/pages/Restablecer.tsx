import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Boton, Campo, EstadoCarga, MensajeError, Tarjeta } from '../components/ui'

export default function Restablecer() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (loading) {
    return <EstadoCarga />
  }

  // El enlace del correo abre esta página ya con la sesión de recuperación.
  if (!session) {
    return (
      <AuthLayout>
        <Tarjeta className="p-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-red-50 text-3xl">
            ⏰
          </div>
          <h1 className="text-2xl font-extrabold">Enlace inválido o expirado</h1>
          <p className="mt-2 text-sm text-tinta-suave">
            Este enlace de recuperación ya no es válido. Solicita uno nuevo y
            úsalo apenas llegue a tu correo.
          </p>
          <Link
            to="/recuperar"
            className="mt-6 inline-block font-semibold text-wom-600 hover:underline"
          >
            Solicitar nuevo enlace
          </Link>
        </Tarjeta>
      </AuthLayout>
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
    <AuthLayout>
      <Tarjeta className="p-8">
        <h1 className="text-2xl font-extrabold">Nueva contraseña</h1>
        <p className="mb-6 mt-1 text-sm text-tinta-suave">
          Define la nueva contraseña para {session.user.email}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Campo
            etiqueta="Nueva contraseña"
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Campo
            etiqueta="Repite la contraseña"
            id="confirmacion"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />

          {error && <MensajeError>{error}</MensajeError>}

          <Boton type="submit" disabled={guardando} className="w-full">
            {guardando ? 'Guardando…' : 'Guardar contraseña'}
          </Boton>
        </form>
      </Tarjeta>
    </AuthLayout>
  )
}
