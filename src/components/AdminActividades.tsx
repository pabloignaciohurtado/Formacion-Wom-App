import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Boton, Campo, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Actividad = Tables<'actividades'>
type Completada = Tables<'actividades_completadas'>

export function AdminActividades({
  totalActivos,
  nombresPorId,
}: {
  totalActivos: number
  nombresPorId: Record<string, string>
}) {
  const { user } = useAuth()
  const [actividades, setActividades] = useState<Actividad[] | null>(null)
  const [completadas, setCompletadas] = useState<Completada[]>([])
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enlace, setEnlace] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    const [acts, hechas] = await Promise.all([
      supabase
        .from('actividades')
        .select('*')
        .order('creada_en', { ascending: false }),
      supabase.from('actividades_completadas').select('*'),
    ])
    setActividades(acts.data ?? [])
    setCompletadas(hechas.data ?? [])
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setCreando(true)
    const { error: insertError } = await supabase.from('actividades').insert({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      enlace: enlace.trim() || null,
      fecha_limite: fechaLimite || null,
      creada_por: user?.id ?? null,
    })
    setCreando(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTitulo('')
    setDescripcion('')
    setEnlace('')
    setFechaLimite('')
    void cargar()
  }

  const desactivar = async (actividad: Actividad) => {
    setError(null)
    const { error: updateError } = await supabase
      .from('actividades')
      .update({ activa: false })
      .eq('id', actividad.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Actividades obligatorias</h2>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      <Tarjeta className="mt-3">
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Título"
              id="act-titulo"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Descripción"
              id="act-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <Campo
            etiqueta="Enlace al material (opcional)"
            id="act-enlace"
            type="url"
            placeholder="https://…"
            value={enlace}
            onChange={(e) => setEnlace(e.target.value)}
          />
          <Campo
            etiqueta="Fecha límite (opcional)"
            id="act-fecha"
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Boton type="submit" disabled={creando || !titulo.trim()}>
              {creando ? 'Publicando…' : 'Publicar actividad'}
            </Boton>
          </div>
        </form>
      </Tarjeta>

      {!actividades ? (
        <EstadoCarga texto="Cargando actividades…" />
      ) : actividades.length === 0 ? (
        <p className="mt-3 text-tinta-suave">Aún no hay actividades publicadas.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {actividades.map((a) => {
            const quienes = completadas.filter((c) => c.actividad_id === a.id)
            const avance =
              totalActivos > 0
                ? Math.round((quienes.length / totalActivos) * 100)
                : 0
            return (
              <li key={a.id}>
                <Tarjeta className={a.activa ? '' : 'opacity-60'}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="flex-1 font-bold">
                      {a.titulo}
                      {!a.activa && (
                        <span className="ml-2 text-xs font-semibold text-tinta-suave">
                          (archivada)
                        </span>
                      )}
                    </h3>
                    {a.fecha_limite && (
                      <span className="text-xs font-semibold text-tinta-suave">
                        límite {new Date(`${a.fecha_limite}T12:00:00`).toLocaleDateString()}
                      </span>
                    )}
                    {a.activa && (
                      <button
                        type="button"
                        onClick={() => void desactivar(a)}
                        className="text-tinta-suave transition-colors hover:text-red-500"
                        aria-label="Archivar actividad"
                        title="Archivar actividad"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-niebla">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-wom-600 to-exito transition-all duration-500"
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-tinta-suave">
                      {quienes.length}/{totalActivos}
                    </span>
                  </div>
                  {quienes.length > 0 && (
                    <p className="mt-2 text-xs text-tinta-suave">
                      Completada por:{' '}
                      {quienes
                        .map((c) => nombresPorId[c.user_id] ?? 'desconocido')
                        .join(', ')}
                    </p>
                  )}
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
