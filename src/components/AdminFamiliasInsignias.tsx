import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { actualizarProgresoFamilia } from '../lib/insignias'
import { ETIQUETAS_CATEGORIA, ORDEN_CATEGORIAS } from '../lib/catalogoInsignias'
import { Boton, Campo, EstadoCarga, MensajeError, Tarjeta } from './ui'
import type { Tables } from '../lib/database.types'

type Familia = Tables<'familias_insignias'>
type Medalla = Tables<'insignias'>
type Perfil = Tables<'profiles'>

// Las familias de insignias son siempre de desempeño (ventas, retención,
// post-venta, habilidades blandas, satisfacción, constancia, cultura): las
// de formación se auto-otorgan y no tienen familia/umbral.
const CATEGORIAS_FAMILIA = ORDEN_CATEGORIAS.filter((c) => c !== 'formacion')

const TIERS = ['bronce', 'plata', 'oro'] as const
type Tier = (typeof TIERS)[number]

const COLOR_TIER: Record<Tier, string> = {
  bronce: '#b08d57',
  plata: '#9ca3af',
  oro: '#f59e0b',
}
const ETIQUETA_TIER: Record<Tier, string> = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }

interface FamiliaConMedallas extends Familia {
  medallas: Medalla[]
}

interface FormMedalla {
  nombre: string
  titulo: string
  icono: string
  criterio: string
  umbral: string
}

function medallaVacia(): FormMedalla {
  return { nombre: '', titulo: '', icono: '🏅', criterio: '', umbral: '' }
}

// Slug simple a partir del nombre: minúsculas, sin acentos ni espacios. Es
// el `id` de texto libre que usan tanto `familias_insignias` como cada
// medalla de `insignias` (`<slug>-<tier>`).
function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Alta, edición y desactivación de familias de insignias (una métrica con 3
// medallas bronce/plata/oro, cada una con su propio umbral numérico) y carga
// del progreso de un ejecutivo en una familia, que dispara el otorgamiento
// automático de la medalla que corresponda (ver `actualizarProgresoFamilia`
// en `lib/insignias.ts`). Desactivar una familia o una medalla puntual
// (`activa=false`) las saca del catálogo activo, pero lo ya obtenido sigue
// visible para quien lo ganó (el álbum no filtra por `activa`, filtra la
// obtención).
export function AdminFamiliasInsignias() {
  const { user } = useAuth()
  const [familias, setFamilias] = useState<FamiliaConMedallas[] | null>(null)
  const [ejecutivos, setEjecutivos] = useState<Perfil[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Formulario de alta
  const [nombreFamilia, setNombreFamilia] = useState('')
  const [categoriaFamilia, setCategoriaFamilia] = useState(CATEGORIAS_FAMILIA[0] ?? 'ventas')
  const [descripcionFamilia, setDescripcionFamilia] = useState('')
  const [criterioFamilia, setCriterioFamilia] = useState('')
  const [medallasForm, setMedallasForm] = useState<Record<Tier, FormMedalla>>({
    bronce: medallaVacia(),
    plata: medallaVacia(),
    oro: medallaVacia(),
  })
  const [creando, setCreando] = useState(false)

  // Edición inline: qué familia/medalla está expandida para editar
  const [familiaEditando, setFamiliaEditando] = useState<string | null>(null)
  const [edicionFamilia, setEdicionFamilia] = useState<Partial<Familia>>({})
  const [edicionMedallas, setEdicionMedallas] = useState<Record<string, Partial<Medalla>>>({})
  const [guardando, setGuardando] = useState(false)

  // Carga de progreso
  const [ejecutivoId, setEjecutivoId] = useState('')
  const [familiaProgresoId, setFamiliaProgresoId] = useState('')
  const [valorProgreso, setValorProgreso] = useState('')
  const [enviandoProgreso, setEnviandoProgreso] = useState(false)

  const cargar = useCallback(async () => {
    const [{ data: familiasData, error: familiasError }, { data: medallasData }, { data: perfiles }] =
      await Promise.all([
        supabase.from('familias_insignias').select('*').order('orden').order('nombre'),
        supabase.from('insignias').select('*').not('familia_id', 'is', null).order('orden'),
        supabase.from('profiles').select('*').eq('role', 'ejecutivo').eq('activo', true).order('nombre'),
      ])
    if (familiasError) {
      setError(familiasError.message)
      return
    }
    const porFamilia = new Map<string, Medalla[]>()
    for (const m of medallasData ?? []) {
      if (!m.familia_id) continue
      const arr = porFamilia.get(m.familia_id) ?? []
      arr.push(m)
      porFamilia.set(m.familia_id, arr)
    }
    setFamilias(
      (familiasData ?? []).map((f) => ({ ...f, medallas: porFamilia.get(f.id) ?? [] }))
    )
    setEjecutivos(perfiles ?? [])
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const medallasOrdenadas = useCallback(
    (f: FamiliaConMedallas) =>
      [...f.medallas].sort((a, b) => TIERS.indexOf(a.tier as Tier) - TIERS.indexOf(b.tier as Tier)),
    []
  )

  const crearFamilia = async () => {
    if (!nombreFamilia.trim() || !categoriaFamilia) return
    for (const tier of TIERS) {
      const m = medallasForm[tier]
      if (!m.nombre.trim() || !m.criterio.trim() || !m.umbral.trim()) {
        setError(`Completa nombre, criterio y umbral de la medalla ${ETIQUETA_TIER[tier]}.`)
        return
      }
      if (Number.isNaN(Number(m.umbral))) {
        setError(`El umbral de la medalla ${ETIQUETA_TIER[tier]} debe ser un número.`)
        return
      }
    }
    setCreando(true)
    setError(null)
    setExito(null)

    const id = slugificar(nombreFamilia)
    if (!id) {
      setCreando(false)
      setError('El nombre de la familia debe tener al menos una letra o número.')
      return
    }

    const { error: familiaError } = await supabase.from('familias_insignias').insert({
      id,
      nombre: nombreFamilia.trim(),
      descripcion: descripcionFamilia.trim(),
      categoria: categoriaFamilia,
      criterio: criterioFamilia.trim(),
    })
    if (familiaError) {
      setCreando(false)
      setError(familiaError.message)
      return
    }

    const { error: medallasError } = await supabase.from('insignias').insert(
      TIERS.map((tier, i) => {
        const m = medallasForm[tier]
        return {
          id: `${id}-${tier}`,
          nombre: m.nombre.trim(),
          titulo: m.titulo.trim() || ETIQUETA_TIER[tier],
          descripcion: m.criterio.trim(),
          categoria: categoriaFamilia,
          tier,
          icono: m.icono.trim() || '🏅',
          color_hex: COLOR_TIER[tier],
          criterio: m.criterio.trim(),
          orden: i,
          umbral: Number(m.umbral),
          familia_id: id,
        }
      })
    )
    setCreando(false)
    if (medallasError) {
      setError(medallasError.message)
      return
    }
    setExito(`Familia "${nombreFamilia.trim()}" creada con sus 3 medallas.`)
    setNombreFamilia('')
    setDescripcionFamilia('')
    setCriterioFamilia('')
    setMedallasForm({ bronce: medallaVacia(), plata: medallaVacia(), oro: medallaVacia() })
    await cargar()
  }

  const abrirEdicion = (f: FamiliaConMedallas) => {
    if (familiaEditando === f.id) {
      setFamiliaEditando(null)
      return
    }
    setFamiliaEditando(f.id)
    setEdicionFamilia({
      nombre: f.nombre,
      descripcion: f.descripcion,
      categoria: f.categoria,
      criterio: f.criterio,
      activa: f.activa,
    })
    const medallas: Record<string, Partial<Medalla>> = {}
    for (const m of f.medallas) {
      medallas[m.id] = {
        nombre: m.nombre,
        titulo: m.titulo,
        icono: m.icono,
        criterio: m.criterio,
        umbral: m.umbral,
        activa: m.activa,
      }
    }
    setEdicionMedallas(medallas)
  }

  const guardarEdicion = async (familiaId: string) => {
    setGuardando(true)
    setError(null)
    setExito(null)

    const { error: familiaError } = await supabase
      .from('familias_insignias')
      .update(edicionFamilia)
      .eq('id', familiaId)
    if (familiaError) {
      setGuardando(false)
      setError(familiaError.message)
      return
    }

    for (const [medallaId, cambios] of Object.entries(edicionMedallas)) {
      const { error: medallaError } = await supabase
        .from('insignias')
        .update({ ...cambios, descripcion: cambios.criterio ?? undefined })
        .eq('id', medallaId)
      if (medallaError) {
        setGuardando(false)
        setError(medallaError.message)
        return
      }
    }

    setGuardando(false)
    setExito('Cambios guardados.')
    setFamiliaEditando(null)
    await cargar()
  }

  const familiaProgresoActiva = useMemo(
    () => (familias ?? []).filter((f) => f.activa),
    [familias]
  )

  const cargarProgreso = async () => {
    if (!ejecutivoId || !familiaProgresoId || !valorProgreso.trim() || !user) return
    const valor = Number(valorProgreso)
    if (Number.isNaN(valor)) {
      setError('El valor de progreso debe ser un número.')
      return
    }
    setEnviandoProgreso(true)
    setError(null)
    setExito(null)
    const resultado = await actualizarProgresoFamilia(ejecutivoId, familiaProgresoId, valor, user.id)
    setEnviandoProgreso(false)
    if (resultado.error) {
      setError(resultado.error)
      return
    }
    const nombreEjecutivo = ejecutivos?.find((e) => e.id === ejecutivoId)?.nombre ?? ''
    if (resultado.otorgadas.length > 0) {
      const nombres = resultado.otorgadas.map((m) => m.nombre).join(', ')
      setExito(`Progreso cargado. ¡Nueva(s) medalla(s) para ${nombreEjecutivo}: ${nombres}!`)
    } else {
      setExito(`Progreso de ${nombreEjecutivo} actualizado a ${valor}.`)
    }
    setValorProgreso('')
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Familias de insignias (bronce / plata / oro)</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Cada familia agrupa 3 medallas de una misma métrica. Al cargar el progreso de un
        ejecutivo, se otorga sola la medalla cuyo umbral se alcance (nunca se revoca una ya
        ganada).
      </p>

      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}
      {exito && <p className="mt-3 text-sm font-semibold text-exito-texto">{exito}</p>}

      {!familias || !ejecutivos ? (
        <EstadoCarga texto="Cargando…" />
      ) : (
        <>
          <Tarjeta className="mt-3 flex flex-col gap-3">
            <h3 className="text-base font-bold">Nueva familia</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                etiqueta="Nombre de la familia"
                id="familia-nombre"
                value={nombreFamilia}
                onChange={(e) => setNombreFamilia(e.target.value)}
                placeholder="Ej.: Ventas Adicionales"
              />
              <div className="space-y-1.5">
                <label htmlFor="familia-categoria" className="block text-sm font-semibold text-tinta">
                  Categoría
                </label>
                <select
                  id="familia-categoria"
                  value={categoriaFamilia}
                  onChange={(e) => setCategoriaFamilia(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  {CATEGORIAS_FAMILIA.map((c) => (
                    <option key={c} value={c}>
                      {ETIQUETAS_CATEGORIA[c] ?? c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Campo
              etiqueta="Descripción (qué mide la familia)"
              id="familia-descripcion"
              value={descripcionFamilia}
              onChange={(e) => setDescripcionFamilia(e.target.value)}
              placeholder="Ej.: Reconoce el volumen de ventas adicionales cerradas en el mes"
            />
            <Campo
              etiqueta="Criterio general (texto libre)"
              id="familia-criterio"
              value={criterioFamilia}
              onChange={(e) => setCriterioFamilia(e.target.value)}
              placeholder="Ej.: Progreso acumulado de ventas adicionales del mes"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {TIERS.map((tier) => (
                <div key={tier} className="rounded-xl border border-gray-200 p-3">
                  <p className="text-sm font-bold" style={{ color: COLOR_TIER[tier] }}>
                    Medalla {ETIQUETA_TIER[tier]}
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    <Campo
                      etiqueta="Nombre"
                      id={`medalla-${tier}-nombre`}
                      value={medallasForm[tier].nombre}
                      onChange={(e) =>
                        setMedallasForm((prev) => ({
                          ...prev,
                          [tier]: { ...prev[tier], nombre: e.target.value },
                        }))
                      }
                    />
                    <Campo
                      etiqueta="Título (subtítulo, opcional)"
                      id={`medalla-${tier}-titulo`}
                      value={medallasForm[tier].titulo}
                      onChange={(e) =>
                        setMedallasForm((prev) => ({
                          ...prev,
                          [tier]: { ...prev[tier], titulo: e.target.value },
                        }))
                      }
                      placeholder={ETIQUETA_TIER[tier]}
                    />
                    <Campo
                      etiqueta="Ícono (emoji)"
                      id={`medalla-${tier}-icono`}
                      value={medallasForm[tier].icono}
                      onChange={(e) =>
                        setMedallasForm((prev) => ({
                          ...prev,
                          [tier]: { ...prev[tier], icono: e.target.value },
                        }))
                      }
                    />
                    <Campo
                      etiqueta="Criterio"
                      id={`medalla-${tier}-criterio`}
                      value={medallasForm[tier].criterio}
                      onChange={(e) =>
                        setMedallasForm((prev) => ({
                          ...prev,
                          [tier]: { ...prev[tier], criterio: e.target.value },
                        }))
                      }
                      placeholder="Ej.: Alcanzar 10 ventas adicionales en el mes"
                    />
                    <Campo
                      etiqueta="Umbral (número)"
                      id={`medalla-${tier}-umbral`}
                      type="number"
                      value={medallasForm[tier].umbral}
                      onChange={(e) =>
                        setMedallasForm((prev) => ({
                          ...prev,
                          [tier]: { ...prev[tier], umbral: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <Boton
              type="button"
              disabled={creando || !nombreFamilia.trim()}
              onClick={() => void crearFamilia()}
              className="self-start"
            >
              Crear familia con sus 3 medallas
            </Boton>
          </Tarjeta>

          <h3 className="mt-8 text-base font-bold">Familias existentes</h3>
          {familias.length === 0 ? (
            <p className="mt-2 text-sm text-tinta-suave">Todavía no hay ninguna familia creada.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {familias.map((f) => (
                <li key={f.id}>
                  <Tarjeta className={f.activa ? '' : 'opacity-60'}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {f.nombre}{' '}
                          <span className="text-xs font-normal text-tinta-suave">
                            ({ETIQUETAS_CATEGORIA[f.categoria] ?? f.categoria})
                          </span>
                          {!f.activa && (
                            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              Inactiva
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-tinta-suave">{f.descripcion}</p>
                      </div>
                      <Boton
                        type="button"
                        variante="fantasma"
                        onClick={() => abrirEdicion(f)}
                      >
                        {familiaEditando === f.id ? 'Cerrar' : 'Editar'}
                      </Boton>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {medallasOrdenadas(f).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 p-2 text-sm"
                        >
                          <span className="text-2xl">{m.icono}</span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {m.nombre}{' '}
                              {!m.activa && (
                                <span className="text-[10px] font-normal text-tinta-suave">
                                  (inactiva)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-tinta-suave">
                              {ETIQUETA_TIER[m.tier as Tier] ?? m.tier} · umbral {m.umbral ?? '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {familiaEditando === f.id && (
                      <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Campo
                            etiqueta="Nombre"
                            id={`edit-${f.id}-nombre`}
                            value={edicionFamilia.nombre ?? ''}
                            onChange={(e) =>
                              setEdicionFamilia((prev) => ({ ...prev, nombre: e.target.value }))
                            }
                          />
                          <div className="space-y-1.5">
                            <label
                              htmlFor={`edit-${f.id}-categoria`}
                              className="block text-sm font-semibold text-tinta"
                            >
                              Categoría
                            </label>
                            <select
                              id={`edit-${f.id}-categoria`}
                              value={edicionFamilia.categoria ?? f.categoria}
                              onChange={(e) =>
                                setEdicionFamilia((prev) => ({ ...prev, categoria: e.target.value }))
                              }
                              className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                            >
                              {CATEGORIAS_FAMILIA.map((c) => (
                                <option key={c} value={c}>
                                  {ETIQUETAS_CATEGORIA[c] ?? c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Campo
                          etiqueta="Descripción"
                          id={`edit-${f.id}-descripcion`}
                          value={edicionFamilia.descripcion ?? ''}
                          onChange={(e) =>
                            setEdicionFamilia((prev) => ({ ...prev, descripcion: e.target.value }))
                          }
                        />
                        <Campo
                          etiqueta="Criterio general"
                          id={`edit-${f.id}-criterio`}
                          value={edicionFamilia.criterio ?? ''}
                          onChange={(e) =>
                            setEdicionFamilia((prev) => ({ ...prev, criterio: e.target.value }))
                          }
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold text-tinta">
                          <input
                            type="checkbox"
                            checked={edicionFamilia.activa ?? f.activa}
                            onChange={(e) =>
                              setEdicionFamilia((prev) => ({ ...prev, activa: e.target.checked }))
                            }
                          />
                          Familia activa (visible como alcanzable en el álbum)
                        </label>

                        <div className="grid gap-3 sm:grid-cols-3">
                          {medallasOrdenadas(f).map((m) => {
                            const cambios = edicionMedallas[m.id] ?? {}
                            return (
                              <div key={m.id} className="rounded-xl border border-gray-200 p-3">
                                <p
                                  className="text-sm font-bold"
                                  style={{ color: COLOR_TIER[m.tier as Tier] ?? '#4D008C' }}
                                >
                                  {ETIQUETA_TIER[m.tier as Tier] ?? m.tier}
                                </p>
                                <div className="mt-2 flex flex-col gap-2">
                                  <Campo
                                    etiqueta="Nombre"
                                    id={`edit-${m.id}-nombre`}
                                    value={cambios.nombre ?? ''}
                                    onChange={(e) =>
                                      setEdicionMedallas((prev) => ({
                                        ...prev,
                                        [m.id]: { ...prev[m.id], nombre: e.target.value },
                                      }))
                                    }
                                  />
                                  <Campo
                                    etiqueta="Título"
                                    id={`edit-${m.id}-titulo`}
                                    value={cambios.titulo ?? ''}
                                    onChange={(e) =>
                                      setEdicionMedallas((prev) => ({
                                        ...prev,
                                        [m.id]: { ...prev[m.id], titulo: e.target.value },
                                      }))
                                    }
                                  />
                                  <Campo
                                    etiqueta="Ícono"
                                    id={`edit-${m.id}-icono`}
                                    value={cambios.icono ?? ''}
                                    onChange={(e) =>
                                      setEdicionMedallas((prev) => ({
                                        ...prev,
                                        [m.id]: { ...prev[m.id], icono: e.target.value },
                                      }))
                                    }
                                  />
                                  <Campo
                                    etiqueta="Criterio"
                                    id={`edit-${m.id}-criterio`}
                                    value={cambios.criterio ?? ''}
                                    onChange={(e) =>
                                      setEdicionMedallas((prev) => ({
                                        ...prev,
                                        [m.id]: { ...prev[m.id], criterio: e.target.value },
                                      }))
                                    }
                                  />
                                  <Campo
                                    etiqueta="Umbral"
                                    id={`edit-${m.id}-umbral`}
                                    type="number"
                                    value={cambios.umbral ?? ''}
                                    onChange={(e) =>
                                      setEdicionMedallas((prev) => ({
                                        ...prev,
                                        [m.id]: { ...prev[m.id], umbral: Number(e.target.value) },
                                      }))
                                    }
                                  />
                                  <label className="flex items-center gap-2 text-xs font-semibold text-tinta">
                                    <input
                                      type="checkbox"
                                      checked={cambios.activa ?? m.activa}
                                      onChange={(e) =>
                                        setEdicionMedallas((prev) => ({
                                          ...prev,
                                          [m.id]: { ...prev[m.id], activa: e.target.checked },
                                        }))
                                      }
                                    />
                                    Medalla activa
                                  </label>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <Boton
                          type="button"
                          disabled={guardando}
                          onClick={() => void guardarEdicion(f.id)}
                          className="self-start"
                        >
                          Guardar cambios
                        </Boton>
                      </div>
                    )}
                  </Tarjeta>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-8 text-base font-bold">Cargar progreso de un ejecutivo</h3>
          <p className="mt-1 text-sm text-tinta-suave">
            Al guardar, se otorga sola cualquier medalla de la familia cuyo umbral quede cubierto
            por el nuevo valor (si el ejecutivo aún no la tenía).
          </p>
          <Tarjeta className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="progreso-ejecutivo" className="block text-sm font-semibold text-tinta">
                  Ejecutivo
                </label>
                <select
                  id="progreso-ejecutivo"
                  value={ejecutivoId}
                  onChange={(e) => setEjecutivoId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="">Selecciona un ejecutivo</option>
                  {ejecutivos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="progreso-familia" className="block text-sm font-semibold text-tinta">
                  Familia
                </label>
                <select
                  id="progreso-familia"
                  value={familiaProgresoId}
                  onChange={(e) => setFamiliaProgresoId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  <option value="">Selecciona una familia</option>
                  {familiaProgresoActiva.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Campo
                etiqueta="Valor acumulado"
                id="progreso-valor"
                type="number"
                value={valorProgreso}
                onChange={(e) => setValorProgreso(e.target.value)}
                placeholder="Ej.: 15"
              />
            </div>
            <Boton
              type="button"
              disabled={!ejecutivoId || !familiaProgresoId || !valorProgreso.trim() || enviandoProgreso}
              onClick={() => void cargarProgreso()}
              className="self-start"
            >
              Guardar progreso
            </Boton>
          </Tarjeta>
        </>
      )}
    </>
  )
}
