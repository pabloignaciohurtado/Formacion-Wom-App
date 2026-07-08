import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import type { Tables } from '../lib/database.types'

type Consulta = Tables<'consultas'>

export default function Consultas() {
  const { user, perfil } = useAuth()
  const [consultas, setConsultas] = useState<Consulta[] | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
    setConsultas(data ?? [])
  }, [user])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !perfil) return
    setError(null)
    setEnviando(true)
    const { error: insertError } = await supabase.from('consultas').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      user_nombre: perfil.nombre,
      texto: texto.trim(),
    })
    setEnviando(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTexto('')
    void cargar()
  }

  return (
    <section>
      <h2>Consultas</h2>
      <p>Envía tus preguntas al equipo de formación.</p>

      <form className="formulario-consulta" onSubmit={handleSubmit}>
        <label htmlFor="texto">Nueva consulta</label>
        <textarea
          id="texto"
          required
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {error && <p role="alert" className="mensaje-error">{error}</p>}
        <button type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? 'Enviando…' : 'Enviar consulta'}
        </button>
      </form>

      {!consultas ? (
        <p className="estado-carga">Cargando consultas…</p>
      ) : consultas.length === 0 ? (
        <p>Aún no has enviado consultas.</p>
      ) : (
        <ul className="lista-consultas">
          {consultas.map((c) => (
            <li key={c.id} className="tarjeta-consulta">
              <p className="texto-consulta">{c.texto}</p>
              <p className="meta-consulta">
                {new Date(c.fecha).toLocaleString()} ·{' '}
                <span className={`estado estado-${c.estado}`}>{c.estado}</span>
              </p>
              {c.respuesta_admin && (
                <p className="respuesta-admin">
                  <strong>Respuesta:</strong> {c.respuesta_admin}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
