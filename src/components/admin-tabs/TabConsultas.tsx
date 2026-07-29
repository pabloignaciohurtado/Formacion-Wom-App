import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Boton, EstadoCarga, MensajeError, Tarjeta } from '../ui'
import { EstadoConsulta } from '../../pages/Consultas'
import type { Tables } from '../../lib/database.types'

type Consulta = Tables<'consultas'>

// Pestaña "Consultas": lista y respuesta a las preguntas de los usuarios.
// Misma lógica que antes vivía inline en Admin.tsx.
export default function TabConsultas() {
  const [consultas, setConsultas] = useState<Consulta[] | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const pendientes = await supabase
      .from('consultas')
      .select('*')
      .order('fecha', { ascending: false })
    setConsultas(pendientes.data ?? [])
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const responder = async (consulta: Consulta) => {
    const respuesta = (respuestas[consulta.id] ?? '').trim()
    if (!respuesta) return
    setError(null)
    const { error: updateError } = await supabase
      .from('consultas')
      .update({
        respuesta_admin: respuesta,
        estado: 'respondida',
        actualizada: new Date().toISOString(),
      })
      .eq('id', consulta.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setRespuestas((prev) => ({ ...prev, [consulta.id]: '' }))
    void cargar()
  }

  return (
    <div>
      {error && (
        <div className="mt-4">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      <h2 className="mt-2 text-lg font-bold">Consultas</h2>
      {!consultas ? (
        <EstadoCarga texto="Cargando consultas…" />
      ) : consultas.length === 0 ? (
        <p className="mt-3 text-tinta-suave">No hay consultas.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {consultas.map((c) => (
            <li key={c.id}>
              <Tarjeta>
                <p className="font-medium">
                  <strong className="text-enlace">{c.user_nombre}:</strong>{' '}
                  {c.texto}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-tinta-suave">
                  {new Date(c.fecha).toLocaleString()}
                  <EstadoConsulta estado={c.estado} />
                </p>
                {c.estado === 'pendiente' ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <textarea
                      rows={2}
                      placeholder="Escribe la respuesta…"
                      value={respuestas[c.id] ?? ''}
                      onChange={(e) =>
                        setRespuestas((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                    />
                    <Boton
                      type="button"
                      disabled={!(respuestas[c.id] ?? '').trim()}
                      onClick={() => void responder(c)}
                      className="sm:self-end"
                    >
                      Responder
                    </Boton>
                  </div>
                ) : (
                  c.respuesta_admin && (
                    <p className="mt-3 rounded-xl border-l-4 border-wom-600 bg-wom-50 px-4 py-2.5 text-sm">
                      <strong>Respuesta:</strong> {c.respuesta_admin}
                    </p>
                  )
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
