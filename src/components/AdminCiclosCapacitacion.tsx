import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { esAdmin } from '../lib/roles'
import {
  ETIQUETAS_ALCANCE,
  destinatariosAInsertar,
  opcionesAlcance,
  personasAsignables,
  type Alcance,
} from '../lib/asignacion'
import { DOMINIOS } from '../data/contenido'
import {
  CalendarioIcono,
  ETIQUETAS_ESTADO_CICLO,
  ETIQUETAS_TIPO_CICLO,
  ICONO_TIPO_CICLO,
  TIPOS_CICLO,
  diasHastaLimite,
  estadoCiclo,
  porcentajeAvance,
  type Ciclo,
  type ProgresoCiclo,
  type TipoCiclo,
} from '../lib/reentrenamiento'
import { Boton, Campo, EstadoCarga, MensajeAviso, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Persona = Pick<Tables<'profiles'>, 'id' | 'nombre' | 'activo' | 'supervisor_id'>

const CLASES_ESTADO: Record<string, string> = {
  en_curso: 'bg-wom-600/10 text-wom-600',
  completado: 'bg-exito/10 text-exito-texto',
  incompleto: 'bg-red-100 text-red-700',
}

// Panel para que admin y supervisor abran ciclos de re-entrenamiento
// (recertificación periódica, reacción a un cambio de producto/procedimiento,
// o refuerzo de un dominio con baja precisión) sobre un dominio del catálogo,
// con una meta de ejercicios y una fecha límite. Mismo patrón de alcance
// ('todos'/'equipo'/'persona') que `AdminActividades`; el avance por persona
// sale del RPC `progreso_ciclos_capacitacion`, porque un supervisor no puede
// leer `attempts` de su equipo directamente (RLS es solo-propio).
export function AdminCiclosCapacitacion() {
  const { user, perfil } = useAuth()
  const soyAdmin = esAdmin(perfil?.role)

  const [personas, setPersonas] = useState<Persona[] | null>(null)
  const [ciclos, setCiclos] = useState<Ciclo[] | null>(null)
  const [progresos, setProgresos] = useState<ProgresoCiclo[]>([])

  const [titulo, setTitulo] = useState('')
  const [dominioId, setDominioId] = useState(DOMINIOS[0].id)
  const [tipo, setTipo] = useState<TipoCiclo>('recertificacion')
  const [metaEjercicios, setMetaEjercicios] = useState('10')
  const [fechaLimite, setFechaLimite] = useState('')
  const [alcance, setAlcance] = useState<Alcance | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    if (!user) return
    const [gente, cics, prog] = await Promise.all([
      supabase.from('profiles').select('id, nombre, activo, supervisor_id'),
      supabase.from('ciclos_capacitacion').select('*').order('creada_en', { ascending: false }),
      supabase.rpc('progreso_ciclos_capacitacion'),
    ])
    setPersonas(gente.data ?? [])
    setCiclos((cics.data ?? []).filter((c) => soyAdmin || c.creada_por === user.id))
    setProgresos(prog.data ?? [])
  }, [user, soyAdmin])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const asignables = useMemo(
    () => personasAsignables(perfil?.role, user?.id ?? '', personas ?? []),
    [perfil?.role, user?.id, personas]
  )
  const opciones = useMemo(
    () => opcionesAlcance(perfil?.role, asignables.length),
    [perfil?.role, asignables.length]
  )
  const alcanceActivo = alcance && opciones.includes(alcance) ? alcance : opciones[0]

  const progresoPorCiclo = useMemo(() => {
    const mapa = new Map<string, ProgresoCiclo[]>()
    for (const p of progresos) {
      const lista = mapa.get(p.ciclo_id) ?? []
      lista.push(p)
      mapa.set(p.ciclo_id, lista)
    }
    return mapa
  }, [progresos])

  const crear = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !alcanceActivo || !fechaLimite) return
    setError(null)

    const ids = destinatariosAInsertar(alcanceActivo, asignables, seleccion)
    if (alcanceActivo === 'persona' && ids.length === 0) {
      setError('Elige al menos una persona.')
      return
    }

    setCreando(true)
    const { data: creado, error: insertError } = await supabase
      .from('ciclos_capacitacion')
      .insert({
        titulo: titulo.trim(),
        dominio_id: dominioId,
        tipo,
        meta_ejercicios: Number(metaEjercicios) || 10,
        fecha_limite: fechaLimite,
        alcance: alcanceActivo,
        creada_por: user.id,
      })
      .select('id')
      .single()

    if (insertError || !creado) {
      setCreando(false)
      setError(insertError?.message ?? 'No se pudo crear el ciclo.')
      return
    }

    if (ids.length > 0) {
      const { error: destError } = await supabase
        .from('ciclos_capacitacion_destinatarios')
        .insert(ids.map((uid) => ({ ciclo_id: creado.id, user_id: uid })))
      if (destError) {
        await supabase.from('ciclos_capacitacion').delete().eq('id', creado.id)
        setCreando(false)
        setError(destError.message)
        return
      }
    }

    setCreando(false)
    setTitulo('')
    setMetaEjercicios('10')
    setFechaLimite('')
    setSeleccion(new Set())
    void cargar()
  }

  const archivar = async (ciclo: Ciclo) => {
    setError(null)
    const { error: updateError } = await supabase
      .from('ciclos_capacitacion')
      .update({ activo: false })
      .eq('id', ciclo.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    void cargar()
  }

  if (personas === null || ciclos === null) {
    return (
      <>
        <h2 className="mt-8 text-lg font-bold">Ciclos de re-entrenamiento</h2>
        <EstadoCarga texto="Cargando ciclos…" />
      </>
    )
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Ciclos de re-entrenamiento</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Recertificación periódica, reacción a un cambio de producto o
        procedimiento, o refuerzo de un dominio con baja precisión ("Contenido
        difícil" en el seguimiento del equipo, más arriba). El avance se mide
        con ejercicios practicados en el dominio desde que se abrió el ciclo.
      </p>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {opciones.length === 0 ? (
        <div className="mt-3">
          <MensajeAviso>
            Aún no tienes equipo asignado. Pide a un administrador que te
            asigne ejecutivos para poder abrirles ciclos.
          </MensajeAviso>
        </div>
      ) : (
        <Tarjeta className="mt-3">
          <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo
                etiqueta="Título"
                id="ciclo-titulo"
                required
                placeholder="Ej: Recertificación Club WOM — Q3 2026"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <label className="text-sm font-semibold text-tinta">
              Dominio
              <select
                value={dominioId}
                onChange={(e) => setDominioId(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-wom-600"
              >
                {DOMINIOS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icono} {d.titulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-tinta">
              Tipo
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCiclo)}
                className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-wom-600"
              >
                {TIPOS_CICLO.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETAS_TIPO_CICLO[t]}
                  </option>
                ))}
              </select>
            </label>

            <Campo
              etiqueta="Meta de ejercicios"
              id="ciclo-meta"
              type="number"
              min={1}
              value={metaEjercicios}
              onChange={(e) => setMetaEjercicios(e.target.value)}
            />
            <Campo
              etiqueta="Fecha límite"
              id="ciclo-fecha"
              type="date"
              required
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-tinta">
                Para quién
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {opciones.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setAlcance(op)}
                    aria-pressed={alcanceActivo === op}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      alcanceActivo === op
                        ? 'bg-wom-600 text-white'
                        : 'bg-niebla text-tinta-suave hover:text-tinta'
                    }`}
                  >
                    {ETIQUETAS_ALCANCE[op]}
                  </button>
                ))}
              </div>
              {alcanceActivo === 'equipo' && (
                <p className="mt-2 text-sm text-tinta-suave">
                  Se abrirá a las {asignables.length} personas de tu equipo:{' '}
                  {asignables.map((p) => p.nombre).join(', ')}.
                </p>
              )}
            </fieldset>

            {alcanceActivo === 'persona' && (
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-tinta">
                  Destinatarios ({seleccion.size} de {asignables.length})
                </p>
                <ul className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-niebla p-2">
                  {asignables.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-niebla">
                        <input
                          type="checkbox"
                          checked={seleccion.has(p.id)}
                          onChange={() =>
                            setSeleccion((prev) => {
                              const nueva = new Set(prev)
                              if (nueva.has(p.id)) nueva.delete(p.id)
                              else nueva.add(p.id)
                              return nueva
                            })
                          }
                          className="size-4 accent-wom-600"
                        />
                        {p.nombre}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="sm:col-span-2">
              <Boton
                type="submit"
                disabled={
                  creando ||
                  !titulo.trim() ||
                  !fechaLimite ||
                  (alcanceActivo === 'persona' && seleccion.size === 0)
                }
              >
                {creando ? 'Abriendo…' : 'Abrir ciclo'}
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}

      {ciclos.length === 0 ? (
        <p className="mt-3 text-tinta-suave">
          {soyAdmin
            ? 'Aún no hay ciclos de re-entrenamiento abiertos.'
            : 'Aún no has abierto ciclos para tu equipo.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {ciclos.map((c) => {
            const dominio = DOMINIOS.find((d) => d.id === c.dominio_id)
            const IconoTipo = ICONO_TIPO_CICLO[(c.tipo as TipoCiclo) ?? 'recertificacion']
            const personasDelCiclo = progresoPorCiclo.get(c.id) ?? []
            const dias = diasHastaLimite(c.fecha_limite)
            return (
              <li key={c.id}>
                <Tarjeta className={c.activo ? '' : 'opacity-60'}>
                  <div className="flex flex-wrap items-center gap-2">
                    <IconoTipo className="size-4 shrink-0 text-wom-600" />
                    <h3 className="flex-1 font-bold">
                      {c.titulo}
                      {!c.activo && (
                        <span className="ml-2 text-xs font-semibold text-tinta-suave">
                          (archivado)
                        </span>
                      )}
                    </h3>
                    <span className="rounded-full bg-wom-600/10 px-2.5 py-0.5 text-xs font-bold text-wom-600">
                      {dominio?.icono} {dominio?.titulo ?? c.dominio_id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-tinta-suave">
                      <CalendarioIcono className="size-3.5" />
                      {dias < 0
                        ? 'venció'
                        : `${new Date(`${c.fecha_limite}T12:00:00`).toLocaleDateString()}`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-tinta-suave">
                    {ETIQUETAS_TIPO_CICLO[(c.tipo as TipoCiclo) ?? 'recertificacion']} · meta{' '}
                    {c.meta_ejercicios} ejercicios en {dominio?.titulo ?? c.dominio_id}
                  </p>

                  {personasDelCiclo.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {personasDelCiclo.map((p) => {
                        const estado = estadoCiclo(c.fecha_limite, p.cumplida)
                        const avance = porcentajeAvance(p.intentos, c.meta_ejercicios)
                        return (
                          <li key={p.user_id} className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="flex-1 truncate font-medium">{p.nombre}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${CLASES_ESTADO[estado]}`}
                              >
                                {ETIQUETAS_ESTADO_CICLO[estado]}
                              </span>
                              <span className="text-xs text-tinta-suave">
                                {p.intentos}/{c.meta_ejercicios} · {p.precision_pct}% precisión
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-niebla">
                              <div
                                className="h-full rounded-full bg-wom-600"
                                style={{ width: `${avance}%` }}
                              />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-tinta-suave">
                      Sin datos de avance todavía.
                    </p>
                  )}

                  {c.activo && (
                    <div className="mt-3">
                      <Boton
                        type="button"
                        variante="fantasma"
                        className="!px-3 !py-1.5 text-sm"
                        onClick={() => void archivar(c)}
                      >
                        Archivar
                      </Boton>
                    </div>
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
