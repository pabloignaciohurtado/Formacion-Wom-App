import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Consulta = Tables<'consultas'>

export function EstadoConsulta({ estado }: { estado: string }) {
  const esPendiente = estado === 'pendiente'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
        esPendiente ? 'bg-amber-100 text-amber-700' : 'bg-exito/15 text-exito-texto'
      }`}
    >
      {estado}
    </span>
  )
}

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
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold lg:text-3xl">Consultas</h1>
      <p className="mt-1 text-tinta-suave">
        Envía tus preguntas al equipo de formación.
      </p>

      <Tarjeta className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="texto" className="block text-sm font-semibold">
            Nueva consulta
          </label>
          <textarea
            id="texto"
            required
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
          />
          {error && <MensajeError>{error}</MensajeError>}
          <Boton type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Enviar consulta'}
          </Boton>
        </form>
      </Tarjeta>

      {!consultas ? (
        <EstadoCarga texto="Cargando consultas…" />
      ) : consultas.length === 0 ? (
        <p className="mt-6 text-center text-tinta-suave">
          Aún no has enviado consultas.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {consultas.map((c) => (
            <li key={c.id}>
              <Tarjeta>
                <p className="font-medium">{c.texto}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-tinta-suave">
                  {new Date(c.fecha).toLocaleString()}
                  <EstadoConsulta estado={c.estado} />
                </p>
                {c.respuesta_admin && (
                  <p className="mt-3 rounded-xl border-l-4 border-wom-600 bg-wom-50 px-4 py-2.5 text-sm">
                    <strong>Respuesta:</strong> {c.respuesta_admin}
                  </p>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
