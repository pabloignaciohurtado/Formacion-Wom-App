import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
      <main className="pantalla-login">
        <div className="tarjeta-login">
          <h1>Revisa tu correo</h1>
          <p>
            Si existe una cuenta para <strong>{email}</strong>, te enviamos un
            enlace para restablecer tu contraseña. El enlace expira pronto, así
            que úsalo apenas llegue.
          </p>
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla-login">
      <form className="tarjeta-login" onSubmit={handleSubmit}>
        <h1>Recuperar contraseña</h1>
        <p className="subtitulo">
          Te enviaremos un enlace a tu correo para crear una nueva contraseña.
        </p>

        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <p role="alert" className="mensaje-error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </button>

        <p className="subtitulo">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </form>
    </main>
  )
}
