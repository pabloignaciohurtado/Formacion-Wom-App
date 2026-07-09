import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Boton, Campo, MensajeError, Tarjeta } from '../components/ui'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}restablecer`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    )
    setEnviando(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <AuthLayout>
        <Tarjeta className="p-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-wom-50 text-3xl">
            📬
          </div>
          <h1 className="text-2xl font-extrabold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-tinta-suave">
            Si existe una cuenta para <strong>{email}</strong>, te enviamos un
            enlace para restablecer tu contraseña. Úsalo apenas llegue.
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
        <h1 className="text-2xl font-extrabold">Recuperar contraseña</h1>
        <p className="mb-6 mt-1 text-sm text-tinta-suave">
          Te enviaremos un enlace a tu correo para crear una nueva contraseña.
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

          {error && <MensajeError>{error}</MensajeError>}

          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </Boton>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-wom-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </Tarjeta>
    </AuthLayout>
  )
}
