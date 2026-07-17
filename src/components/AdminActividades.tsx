import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ExternalLink, Paperclip, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { esAdmin } from '../lib/roles'
import {
  ETIQUETAS_ALCANCE,
  denominadorAvance,
  destinatariosAInsertar,
  opcionesAlcance,
  personasAsignables,
  type Alcance,
} from '../lib/asignacion'
import { ETIQUETAS_TIPO, ICONO_TIPO, type Material, type TipoMaterial } from '../lib/materiales'
import { Boton, Campo, EstadoCarga, MensajeAviso, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Actividad = Tables<'actividades'>
type Completada = Tables<'actividades_completadas'>
type Destinatario = Tables<'actividades_destinatarios'>
type Adjunto = Tables<'actividad_materiales'>
type Persona = Pick<Tables<'profiles'>, 'id' | 'nombre' | 'activo' | 'supervisor_id'>

// Pantalla de asignación de módulos obligatorios. La usan el admin (en
// Administración) y los supervisores (en Mi equipo). No recibe props: carga
// los perfiles visibles y la RLS ya decide el universo — el admin ve a todos,
// un supervisor solo a su equipo. La interfaz nunca ofrece lo que la base
// rechazaría.
export function AdminActividades() {
  const { user, perfil } = useAuth()
  const soyAdmin = esAdmin(perfil?.role)

  const [personas, setPersonas] = useState<Persona[] | null>(null)
  const [actividades, setActividades] = useState<Actividad[] | null>(null)
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [completadas, setCompletadas] = useState<Completada[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enlace, setEnlace] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [alcance, setAlcance] = useState<Alcance | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [materialesSeleccion, setMaterialesSeleccion] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    if (!user) return
    const [gente, acts, dest, hechas, mats, adj] = await Promise.all([
      supabase.from('profiles').select('id, nombre, activo, supervisor_id'),
      supabase.from('actividades').select('*').order('creada_en', { ascending: false }),
      supabase.from('actividades_destinatarios').select('*'),
      supabase.from('actividades_completadas').select('*'),
      // Todos los materiales visibles (activos + propios archivados) para
      // poder mostrar lo ya adjunto aunque luego se archive en la biblioteca.
      supabase.from('materiales').select('*'),
      supabase.from('actividad_materiales').select('*'),
    ])
    setPersonas(gente.data ?? [])
    // El admin gestiona todas; un supervisor, las que él asignó.
    setActividades(
      (acts.data ?? []).filter((a) => soyAdmin || a.creada_por === user.id)
    )
    setDestinatarios(dest.data ?? [])
    setCompletadas(hechas.data ?? [])
    setMateriales(mats.data ?? [])
    setAdjuntos(adj.data ?? [])
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

  const nombresPorId = useMemo(
    () => Object.fromEntries((personas ?? []).map((p) => [p.id, p.nombre])),
    [personas]
  )
  const totalActivos = (personas ?? []).filter((p) => p.activo).length

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return q ? asignables.filter((p) => p.nombre.toLowerCase().includes(q)) : asignables
  }, [asignables, filtro])

  const materialesPorId = useMemo(
    () => Object.fromEntries(materiales.map((m) => [m.id, m])),
    [materiales]
  )
  // Solo lo activo tiene sentido ofrecer al crear una actividad nueva; lo
  // archivado sigue mostrándose en actividades que ya lo tenían adjunto.
  const materialesDisponibles = useMemo(
    () => materiales.filter((m) => m.activo),
    [materiales]
  )
  const materialesPorActividad = useMemo(() => {
    const mapa = new Map<string, Material[]>()
    for (const adj of adjuntos) {
      const material = materialesPorId[adj.material_id]
      if (!material) continue
      const lista = mapa.get(adj.actividad_id) ?? []
      lista.push(material)
      mapa.set(adj.actividad_id, lista)
    }
    return mapa
  }, [adjuntos, materialesPorId])

  const abrirMaterial = async (material: Material) => {
    setError(null)
    if (material.storage_path) {
      const { data, error: urlError } = await supabase.storage
        .from('materiales')
        .createSignedUrl(material.storage_path, 60)
      if (urlError || !data) {
        setError(urlError?.message ?? 'No se pudo generar el enlace de descarga.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } else if (material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer')
    }
  }

  const alternarMaterial = (id: string) => {
    setMaterialesSeleccion((prev) => {
      const nueva = new Set(prev)
      if (nueva.has(id)) nueva.delete(id)
      else nueva.add(id)
      return nueva
    })
  }

  const alternarSeleccion = (id: string) => {
    setSeleccion((prev) => {
      const nueva = new Set(prev)
      if (nueva.has(id)) nueva.delete(id)
      else nueva.add(id)
      return nueva
    })
  }

  const crear = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !alcanceActivo) return
    setError(null)

    const ids = destinatariosAInsertar(alcanceActivo, asignables, seleccion)
    if (alcanceActivo === 'persona' && ids.length === 0) {
      setError('Elige al menos una persona.')
      return
    }

    setCreando(true)
    const { data: creada, error: insertError } = await supabase
      .from('actividades')
      .insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        enlace: enlace.trim() || null,
        fecha_limite: fechaLimite || null,
        alcance: alcanceActivo,
        creada_por: user.id,
      })
      .select('id')
      .single()

    if (insertError || !creada) {
      setCreando(false)
      setError(insertError?.message ?? 'No se pudo crear la actividad.')
      return
    }

    if (ids.length > 0) {
      const { error: destError } = await supabase
        .from('actividades_destinatarios')
        .insert(ids.map((uid) => ({ actividad_id: creada.id, user_id: uid })))
      if (destError) {
        // Sin destinatarios la actividad quedaría invisible: mejor no dejarla.
        await supabase.from('actividades').delete().eq('id', creada.id)
        setCreando(false)
        setError(destError.message)
        return
      }
    }

    if (materialesSeleccion.size > 0) {
      const { error: matError } = await supabase.from('actividad_materiales').insert(
        Array.from(materialesSeleccion).map((material_id) => ({
          actividad_id: creada.id,
          material_id,
        }))
      )
      // A diferencia de los destinatarios, un material adjunto es un extra:
      // si falla no tiene sentido borrar la actividad ya publicada, solo
      // avisar para que se reintente agregarlo.
      if (matError) setError(`Actividad creada, pero no se pudieron adjuntar los materiales: ${matError.message}`)
    }

    setCreando(false)
    setTitulo('')
    setDescripcion('')
    setEnlace('')
    setFechaLimite('')
    setSeleccion(new Set())
    setMaterialesSeleccion(new Set())
    setFiltro('')
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

  if (personas === null || actividades === null) {
    return (
      <>
        <h2 className="mt-8 text-lg font-bold">Actividades obligatorias</h2>
        <EstadoCarga texto="Cargando actividades…" />
      </>
    )
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Actividades obligatorias</h2>
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {opciones.length === 0 ? (
        <div className="mt-3">
          <MensajeAviso>
            Aún no tienes equipo asignado. Pide a un administrador que te asigne
            ejecutivos para poder asignarles módulos.
          </MensajeAviso>
        </div>
      ) : (
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

            {materialesDisponibles.length > 0 && (
              <fieldset className="sm:col-span-2">
                <legend className="flex items-center gap-1.5 text-sm font-semibold text-tinta">
                  <Paperclip className="size-4" />
                  Materiales adjuntos ({materialesSeleccion.size} de{' '}
                  {materialesDisponibles.length})
                </legend>
                <ul className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-niebla p-2">
                  {materialesDisponibles.map((m) => {
                    const Icono = ICONO_TIPO[(m.tipo as TipoMaterial) ?? 'enlace']
                    return (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-niebla">
                          <input
                            type="checkbox"
                            checked={materialesSeleccion.has(m.id)}
                            onChange={() => alternarMaterial(m.id)}
                            className="size-4 accent-wom-600"
                          />
                          <Icono className="size-4 shrink-0 text-tinta-suave" />
                          <span className="truncate">{m.titulo}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            )}

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
                  Se asignará a las {asignables.length} personas de tu equipo:{' '}
                  {asignables.map((p) => p.nombre).join(', ')}.
                </p>
              )}
            </fieldset>

            {alcanceActivo === 'persona' && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="act-buscar"
                  className="block text-sm font-semibold text-tinta"
                >
                  Destinatarios ({seleccion.size} de {asignables.length})
                </label>
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
                  <input
                    id="act-buscar"
                    type="search"
                    placeholder="Buscar por nombre…"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-tinta placeholder:text-gray-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                  />
                </div>
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-niebla p-2">
                  {filtradas.length === 0 ? (
                    <li className="px-2 py-1.5 text-sm text-tinta-suave">
                      Nadie coincide con la búsqueda.
                    </li>
                  ) : (
                    filtradas.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-niebla">
                          <input
                            type="checkbox"
                            checked={seleccion.has(p.id)}
                            onChange={() => alternarSeleccion(p.id)}
                            className="size-4 accent-wom-600"
                          />
                          {p.nombre}
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}

            <div className="sm:col-span-2">
              <Boton
                type="submit"
                disabled={
                  creando ||
                  !titulo.trim() ||
                  (alcanceActivo === 'persona' && seleccion.size === 0)
                }
              >
                {creando ? 'Publicando…' : 'Publicar actividad'}
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}

      {actividades.length === 0 ? (
        <p className="mt-3 text-tinta-suave">
          {soyAdmin
            ? 'Aún no hay actividades publicadas.'
            : 'Aún no has asignado módulos a tu equipo.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {actividades.map((a) => {
            const suyos = destinatarios.filter((d) => d.actividad_id === a.id)
            const quienes = completadas.filter((c) => c.actividad_id === a.id)
            const total = denominadorAvance(a.alcance, suyos.length, totalActivos)
            const avance = total > 0 ? Math.round((quienes.length / total) * 100) : 0
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
                    <span className="rounded-full bg-wom-600/10 px-2.5 py-0.5 text-xs font-bold text-wom-600">
                      {/* "Mi equipo" solo tiene sentido para quien la creó */}
                      {a.alcance === 'equipo' && a.creada_por !== user?.id
                        ? 'Equipo'
                        : (ETIQUETAS_ALCANCE[a.alcance as Alcance] ?? a.alcance)}
                    </span>
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

                  {a.alcance !== 'todos' && suyos.length > 0 && (
                    <p className="mt-2 text-xs text-tinta-suave">
                      Para:{' '}
                      {suyos
                        .map((d) => nombresPorId[d.user_id] ?? 'desconocido')
                        .join(', ')}
                    </p>
                  )}

                  {(materialesPorActividad.get(a.id) ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(materialesPorActividad.get(a.id) ?? []).map((m) => {
                        const Icono = ICONO_TIPO[(m.tipo as TipoMaterial) ?? 'enlace']
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => void abrirMaterial(m)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-niebla px-2.5 py-1 text-xs font-semibold text-tinta-suave transition-colors hover:text-wom-600"
                            title={ETIQUETAS_TIPO[(m.tipo as TipoMaterial) ?? 'enlace']}
                          >
                            <Icono className="size-3.5" />
                            {m.titulo}
                            <ExternalLink className="size-3" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-niebla">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-wom-600 to-exito transition-all duration-500"
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-tinta-suave">
                      {quienes.length}/{total}
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
