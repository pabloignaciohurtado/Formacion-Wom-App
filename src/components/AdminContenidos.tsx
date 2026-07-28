import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { BookOpen, Eye, EyeOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { CATEGORIAS, DOMINIOS } from '../data/contenido'
import {
  MAXIMO_OPCIONES,
  idsOcupados,
  normalizarSlug,
  validarEjercicio,
  validarSlugDominio,
} from '../lib/catalogo'
import {
  MAXIMO_CARACTERES_MATERIAL,
  MAXIMO_PREGUNTAS_PEDIDAS,
  MINIMO_PREGUNTAS_PEDIDAS,
  materialDesdePropuesta,
  pedirBorradorIa,
} from '../lib/borradorIa'
import {
  CONTENIDO_VACIO,
  archivarMaterial,
  cambiarPublicacion,
  cargarContenidoRemoto,
  guardarMaterial,
  type BorradorMaterial,
  type BorradorPregunta,
  type ContenidoRemoto,
} from '../lib/contenidoRemoto'
import { Leccion } from './Leccion'
import {
  Boton,
  Campo,
  EstadoCarga,
  MensajeAviso,
  MensajeError,
  Tarjeta,
} from './ui'

const PREGUNTA_VACIA: BorradorPregunta = {
  id: null,
  objetivo: 0,
  enunciado: '',
  opciones: ['', ''],
  correcta: 0,
  explicacion: '',
}

function borradorVacio(): BorradorMaterial {
  return {
    slug: '',
    titulo: '',
    icono: '📘',
    descripcion: '',
    categoriaId: CATEGORIAS[0]?.id ?? 'habilidades',
    publicado: false,
    objetivos: [{ id: null, titulo: '' }],
    preguntas: [{ ...PREGUNTA_VACIA, opciones: ['', ''] }],
    leccionId: null,
    leccionTitulo: '',
    leccionCuerpo: '',
  }
}

const AYUDA_MARKDOWN =
  '## Subtítulo · **negrita** · *cursiva* · - viñeta · 1. numerada · > cita · [texto](https://…) · ![alt](https://…imagen.png)'

// Creador de materiales de aprendizaje: un dominio nuevo con su lección de
// lectura y sus preguntas de práctica, sin tocar código.
//
// El catálogo estático de `data/contenido.ts` no se toca: lo que se crea aquí
// vive en las tablas `contenido_*` y se fusiona con el estático al mostrarlo
// (ver `lib/catalogo.ts`). Así los 127 ejercicios históricos y el avance de
// cada relator quedan fuera de riesgo.
export function AdminContenidos() {
  const { user } = useAuth()
  const [contenido, setContenido] = useState<ContenidoRemoto | null>(null)
  const [borrador, setBorrador] = useState<BorradorMaterial | null>(null)
  const [editandoExistente, setEditandoExistente] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  // Borrador asistido por IA. Vive en el componente y no en el borrador
  // porque es material de entrada: no se guarda con el material, solo sirve
  // para producir la propuesta que después se edita a mano.
  const [panelIa, setPanelIa] = useState(false)
  const [fuenteIa, setFuenteIa] = useState('')
  const [focoIa, setFocoIa] = useState('')
  const [cantidadIa, setCantidadIa] = useState(5)
  const [generando, setGenerando] = useState(false)
  const [errorIa, setErrorIa] = useState<string | null>(null)
  const [avisoIa, setAvisoIa] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    // `false` = también los borradores propios, que son justamente los que el
    // administrador viene a terminar.
    setContenido(await cargarContenidoRemoto(false))
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const ocupados = useMemo(() => {
    const base = idsOcupados(DOMINIOS)
    for (const d of contenido?.dominios ?? []) base.add(d.id)
    for (const o of contenido?.objetivos ?? []) base.add(o.id)
    for (const e of contenido?.ejercicios ?? []) base.add(e.id)
    return base
  }, [contenido])

  const cambiar = (parcial: Partial<BorradorMaterial>) =>
    setBorrador((prev) => (prev ? { ...prev, ...parcial } : prev))

  const limpiarIa = () => {
    setPanelIa(false)
    setFuenteIa('')
    setFocoIa('')
    setErrorIa(null)
    setAvisoIa(null)
  }

  const nuevo = () => {
    setError(null)
    limpiarIa()
    setEditandoExistente(false)
    setBorrador(borradorVacio())
  }

  const editar = (slug: string) => {
    const datos = contenido ?? CONTENIDO_VACIO
    const fila = datos.dominios.find((d) => d.id === slug)
    if (!fila) return
    const objetivos = datos.objetivos
      .filter((o) => o.dominio_id === slug)
      .sort((a, b) => a.orden - b.orden)
    const leccion = datos.lecciones.find((l) => l.dominio_id === slug)
    setError(null)
    limpiarIa()
    setEditandoExistente(true)
    setBorrador({
      slug,
      titulo: fila.titulo,
      icono: fila.icono,
      descripcion: fila.descripcion,
      categoriaId: fila.categoria_id,
      publicado: fila.publicado,
      objetivos: objetivos.map((o) => ({ id: o.id, titulo: o.titulo })),
      preguntas: datos.ejercicios
        .filter((e) => e.dominio_id === slug)
        .sort((a, b) => a.orden - b.orden)
        .map((e) => ({
          id: e.id,
          objetivo: Math.max(
            0,
            objetivos.findIndex((o) => o.id === e.objetivo_id)
          ),
          enunciado: e.enunciado,
          opciones: e.opciones,
          correcta: e.correcta,
          explicacion: e.explicacion,
        })),
      leccionId: leccion?.id ?? null,
      leccionTitulo: leccion?.titulo ?? '',
      leccionCuerpo: leccion?.cuerpo ?? '',
    })
  }

  // Errores en vivo: el administrador los ve mientras escribe, no al guardar.
  const errores = useMemo(() => {
    if (!borrador) return []
    const lista: string[] = []
    if (!borrador.titulo.trim()) lista.push('Ponle un título al material.')
    if (!editandoExistente) {
      const problema = validarSlugDominio(borrador.slug, ocupados)
      if (problema) lista.push(problema)
    }
    const objetivos = borrador.objetivos.filter((o) => o.titulo.trim())
    if (objetivos.length === 0) {
      lista.push('Escribe al menos un objetivo de aprendizaje.')
    }
    if (borrador.preguntas.length === 0) {
      lista.push('Agrega al menos una pregunta de práctica.')
    }
    borrador.preguntas.forEach((pregunta, i) => {
      for (const problema of validarEjercicio(pregunta)) {
        lista.push(`Pregunta ${i + 1}: ${problema}`)
      }
    })
    return lista
  }, [borrador, editandoExistente, ocupados])

  // La propuesta se funde sobre lo que ya hay en el formulario: nada se
  // publica solo. El administrador siempre revisa y guarda a mano.
  const generarConIa = async () => {
    if (!borrador || generando) return
    setGenerando(true)
    setErrorIa(null)
    setAvisoIa(null)
    const { propuesta, error: problema } = await pedirBorradorIa({
      material: fuenteIa,
      cantidadPreguntas: cantidadIa,
      foco: focoIa,
    })
    setGenerando(false)
    if (problema || !propuesta) {
      setErrorIa(problema ?? 'No se pudo generar el borrador.')
      return
    }
    setBorrador(
      materialDesdePropuesta(propuesta, borrador, {
        ocupados,
        editandoExistente,
      })
    )
    setPanelIa(false)
    setAvisoIa(
      'Propuesta generada. Revísala completa antes de publicar: la IA puede equivocarse en cifras, plazos y nombres de planes.'
    )
  }

  const guardar = async (event: FormEvent) => {
    event.preventDefault()
    if (!borrador || !user || errores.length > 0) return
    setGuardando(true)
    setError(null)
    const limpio: BorradorMaterial = {
      ...borrador,
      objetivos: borrador.objetivos.filter((o) => o.titulo.trim()),
    }
    const problema = await guardarMaterial(
      limpio,
      user.id,
      contenido ?? CONTENIDO_VACIO
    )
    setGuardando(false)
    if (problema) {
      setError(problema)
      return
    }
    setBorrador(null)
    setEditandoExistente(false)
    limpiarIa()
    void cargar()
  }

  const publicar = async (slug: string, publicado: boolean) => {
    setError(null)
    const problema = await cambiarPublicacion(slug, publicado)
    if (problema) setError(problema)
    else void cargar()
  }

  const archivar = async (slug: string) => {
    setError(null)
    const problema = await archivarMaterial(slug)
    if (problema) setError(problema)
    else void cargar()
  }

  if (contenido === null) {
    return (
      <>
        <h2 className="mt-8 text-lg font-bold">Materiales de aprendizaje</h2>
        <EstadoCarga texto="Cargando materiales…" />
      </>
    )
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold">Materiales de aprendizaje</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Crea un contenido nuevo con su lección de lectura y sus preguntas de
        práctica. Al publicarlo aparece en Ejercicios junto al resto del
        catálogo y sus preguntas entran al repaso espaciado.
      </p>

      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {contenido.dominios.length > 0 && (
        <ul className="mt-3 space-y-2">
          {contenido.dominios.map((d) => {
            const preguntas = contenido.ejercicios.filter(
              (e) => e.dominio_id === d.id
            ).length
            return (
              <li key={d.id}>
                <Tarjeta className="flex flex-wrap items-center gap-3 !p-4">
                  <span className="text-2xl" aria-hidden>
                    {d.icono}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.titulo}</p>
                    <p className="text-xs text-tinta-suave">
                      {preguntas} {preguntas === 1 ? 'pregunta' : 'preguntas'} ·{' '}
                      {d.publicado ? 'Publicado' : 'Borrador'}
                    </p>
                  </div>
                  <Boton
                    type="button"
                    variante="fantasma"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => editar(d.id)}
                  >
                    Editar
                  </Boton>
                  <Boton
                    type="button"
                    variante="secundario"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => void publicar(d.id, !d.publicado)}
                  >
                    {d.publicado ? (
                      <span className="inline-flex items-center gap-1.5">
                        <EyeOff className="size-4" /> Despublicar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="size-4" /> Publicar
                      </span>
                    )}
                  </Boton>
                  <Boton
                    type="button"
                    variante="fantasma"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => void archivar(d.id)}
                  >
                    Archivar
                  </Boton>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      {!borrador ? (
        <Boton type="button" className="mt-3" onClick={nuevo}>
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-4" /> Crear material
          </span>
        </Boton>
      ) : (
        <Tarjeta className="mt-3">
          {/* Borrador asistido: pegar el material de referencia y recibir una
              propuesta que rellena el formulario de abajo. La clave de la IA
              vive solo en la Edge Function, nunca en el navegador. */}
          <div className="mb-5 rounded-xl border border-dashed border-gray-300 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-tinta">
                <Sparkles className="size-4 text-enlace" />
                Generar borrador con IA
              </p>
              <button
                type="button"
                onClick={() => setPanelIa((v) => !v)}
                aria-expanded={panelIa}
                className="text-sm font-semibold text-enlace underline underline-offset-2"
              >
                {panelIa ? 'Ocultar' : 'Abrir'}
              </button>
            </div>
            <p className="mt-1 text-xs text-tinta-suave">
              Pega un instructivo, un correo de campaña o un procedimiento y la
              IA propone la lección y las preguntas. Nada se publica solo:
              siempre revisas y guardas tú.
            </p>

            {panelIa && (
              <div className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="ia-fuente"
                    className="text-sm font-semibold text-tinta"
                  >
                    Material de referencia
                  </label>
                  <textarea
                    id="ia-fuente"
                    rows={8}
                    value={fuenteIa}
                    maxLength={MAXIMO_CARACTERES_MATERIAL}
                    onChange={(e) => setFuenteIa(e.target.value)}
                    placeholder="Pega aquí el procedimiento, la minuta de la campaña o el instructivo…"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                  />
                  <p className="mt-1 text-xs text-tinta-suave">
                    {fuenteIa.length.toLocaleString('es-CL')} de{' '}
                    {MAXIMO_CARACTERES_MATERIAL.toLocaleString('es-CL')}{' '}
                    caracteres
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Campo
                    etiqueta="Enfoque (opcional)"
                    id="ia-foco"
                    value={focoIa}
                    placeholder="Ej.: objeciones de precio en clientes que piden portabilidad"
                    onChange={(e) => setFocoIa(e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <label
                      htmlFor="ia-cantidad"
                      className="block text-sm font-semibold text-tinta"
                    >
                      Preguntas
                    </label>
                    <input
                      id="ia-cantidad"
                      type="number"
                      min={MINIMO_PREGUNTAS_PEDIDAS}
                      max={MAXIMO_PREGUNTAS_PEDIDAS}
                      value={cantidadIa}
                      onChange={(e) => setCantidadIa(Number(e.target.value))}
                      className="w-24 rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-tinta transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                    />
                  </div>
                </div>

                {errorIa && <MensajeError>{errorIa}</MensajeError>}

                <Boton
                  type="button"
                  variante="secundario"
                  disabled={generando || fuenteIa.trim().length < 40}
                  onClick={() => void generarConIa()}
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-4" />
                    {generando ? 'Generando…' : 'Generar propuesta'}
                  </span>
                </Boton>
                {generando && (
                  <p className="text-xs text-tinta-suave" role="status">
                    Redactando la lección y las preguntas. Puede tardar hasta un
                    minuto.
                  </p>
                )}
              </div>
            )}

            {avisoIa && (
              <div className="mt-3">
                <MensajeAviso>{avisoIa}</MensajeAviso>
              </div>
            )}
          </div>

          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Campo
                  etiqueta="Título del material"
                  id="cont-titulo"
                  required
                  value={borrador.titulo}
                  onChange={(e) => {
                    const titulo = e.target.value
                    cambiar(
                      editandoExistente
                        ? { titulo }
                        : { titulo, slug: normalizarSlug(titulo) }
                    )
                  }}
                />
              </div>
              <Campo
                etiqueta="Identificador"
                id="cont-slug"
                required
                disabled={editandoExistente}
                value={borrador.slug}
                onChange={(e) => cambiar({ slug: normalizarSlug(e.target.value) })}
              />
              <Campo
                etiqueta="Ícono"
                id="cont-icono"
                maxLength={4}
                value={borrador.icono}
                onChange={(e) => cambiar({ icono: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Campo
                  etiqueta="Descripción breve"
                  id="cont-descripcion"
                  value={borrador.descripcion}
                  onChange={(e) => cambiar({ descripcion: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="cont-categoria"
                  className="block text-sm font-semibold text-tinta"
                >
                  Categoría
                </label>
                <select
                  id="cont-categoria"
                  value={borrador.categoriaId}
                  onChange={(e) => cambiar({ categoriaId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-tinta transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icono} {c.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-tinta">
                Objetivos de aprendizaje
              </legend>
              <p className="mt-0.5 text-xs text-tinta-suave">
                Cada pregunta se asocia a un objetivo; así la analítica muestra
                dónde falla el equipo.
              </p>
              <div className="mt-2 space-y-2">
                {borrador.objetivos.map((objetivo, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={objetivo.titulo}
                      placeholder={`Objetivo ${i + 1}`}
                      aria-label={`Objetivo ${i + 1}`}
                      onChange={(e) => {
                        const objetivos = [...borrador.objetivos]
                        objetivos[i] = { ...objetivo, titulo: e.target.value }
                        cambiar({ objetivos })
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2 text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                    />
                    {borrador.objetivos.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Quitar objetivo ${i + 1}`}
                        onClick={() =>
                          cambiar({
                            objetivos: borrador.objetivos.filter(
                              (_, j) => j !== i
                            ),
                          })
                        }
                        className="rounded-lg p-2 text-tinta-suave transition-colors hover:text-magenta-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Boton
                type="button"
                variante="fantasma"
                className="mt-2 !px-3 !py-1.5 text-sm"
                onClick={() =>
                  cambiar({
                    objetivos: [...borrador.objetivos, { id: null, titulo: '' }],
                  })
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="size-4" /> Agregar objetivo
                </span>
              </Boton>
            </fieldset>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="cont-cuerpo"
                  className="text-sm font-semibold text-tinta"
                >
                  Lección
                </label>
                <button
                  type="button"
                  onClick={() => setVistaPrevia((v) => !v)}
                  aria-pressed={vistaPrevia}
                  className="text-sm font-semibold text-enlace underline underline-offset-2"
                >
                  {vistaPrevia ? 'Volver a editar' : 'Ver vista previa'}
                </button>
              </div>
              <div className="mt-2">
                <Campo
                  etiqueta="Título de la lección (opcional)"
                  id="cont-leccion-titulo"
                  value={borrador.leccionTitulo}
                  onChange={(e) => cambiar({ leccionTitulo: e.target.value })}
                />
              </div>
              {vistaPrevia ? (
                <div className="mt-2 rounded-xl border border-gray-200 bg-niebla p-4">
                  <Leccion cuerpo={borrador.leccionCuerpo} />
                  {!borrador.leccionCuerpo.trim() && (
                    <p className="text-sm text-tinta-suave">
                      Aún no has escrito la lección.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    id="cont-cuerpo"
                    rows={10}
                    value={borrador.leccionCuerpo}
                    onChange={(e) => cambiar({ leccionCuerpo: e.target.value })}
                    placeholder="Escribe aquí la lectura que verá el relator antes de practicar…"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 font-mono text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                  />
                  <p className="mt-1 text-xs text-tinta-suave">{AYUDA_MARKDOWN}</p>
                </>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-tinta">
                Preguntas de práctica
              </legend>
              <div className="mt-2 space-y-4">
                {borrador.preguntas.map((pregunta, i) => {
                  const actualizar = (parcial: Partial<BorradorPregunta>) => {
                    const preguntas = [...borrador.preguntas]
                    preguntas[i] = { ...pregunta, ...parcial }
                    cambiar({ preguntas })
                  }
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-tinta">
                          Pregunta {i + 1}
                        </p>
                        {borrador.preguntas.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Quitar pregunta ${i + 1}`}
                            onClick={() =>
                              cambiar({
                                preguntas: borrador.preguntas.filter(
                                  (_, j) => j !== i
                                ),
                              })
                            }
                            className="rounded-lg p-2 text-tinta-suave transition-colors hover:text-magenta-500"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={pregunta.enunciado}
                        aria-label={`Enunciado de la pregunta ${i + 1}`}
                        placeholder="¿Qué debe saber responder el relator?"
                        onChange={(e) => actualizar({ enunciado: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                      />

                      <div className="mt-2 space-y-2">
                        {pregunta.opciones.map((opcion, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correcta-${i}`}
                              checked={pregunta.correcta === j}
                              onChange={() => actualizar({ correcta: j })}
                              aria-label={`Marcar la alternativa ${j + 1} como correcta`}
                              className="size-4 accent-wom-600"
                            />
                            <input
                              value={opcion}
                              placeholder={`Alternativa ${j + 1}`}
                              aria-label={`Alternativa ${j + 1} de la pregunta ${i + 1}`}
                              onChange={(e) => {
                                const opciones = [...pregunta.opciones]
                                opciones[j] = e.target.value
                                actualizar({ opciones })
                              }}
                              className="w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2 text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                            />
                            {pregunta.opciones.length > 2 && (
                              <button
                                type="button"
                                aria-label={`Quitar la alternativa ${j + 1}`}
                                onClick={() => {
                                  const opciones = pregunta.opciones.filter(
                                    (_, k) => k !== j
                                  )
                                  actualizar({
                                    opciones,
                                    correcta:
                                      pregunta.correcta >= opciones.length
                                        ? opciones.length - 1
                                        : pregunta.correcta,
                                  })
                                }}
                                className="rounded-lg p-2 text-tinta-suave transition-colors hover:text-magenta-500"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {pregunta.opciones.length < MAXIMO_OPCIONES && (
                        <Boton
                          type="button"
                          variante="fantasma"
                          className="mt-2 !px-3 !py-1.5 text-sm"
                          onClick={() =>
                            actualizar({ opciones: [...pregunta.opciones, ''] })
                          }
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Plus className="size-4" /> Alternativa
                          </span>
                        </Boton>
                      )}

                      <textarea
                        rows={2}
                        value={pregunta.explicacion}
                        aria-label={`Explicación de la pregunta ${i + 1}`}
                        placeholder="Explicación que verá el relator al responder"
                        onChange={(e) =>
                          actualizar({ explicacion: e.target.value })
                        }
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2.5 text-sm text-tinta transition-shadow placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                      />

                      <div className="mt-2">
                        <label
                          htmlFor={`cont-objetivo-${i}`}
                          className="text-xs font-semibold text-tinta-suave"
                        >
                          Objetivo asociado
                        </label>
                        <select
                          id={`cont-objetivo-${i}`}
                          value={pregunta.objetivo}
                          onChange={(e) =>
                            actualizar({ objetivo: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-superficie px-4 py-2 text-sm text-tinta transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wom-600"
                        >
                          {borrador.objetivos.map((objetivo, j) => (
                            <option key={j} value={j}>
                              {objetivo.titulo.trim() || `Objetivo ${j + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Boton
                type="button"
                variante="fantasma"
                className="mt-3 !px-3 !py-1.5 text-sm"
                onClick={() =>
                  cambiar({
                    preguntas: [
                      ...borrador.preguntas,
                      { ...PREGUNTA_VACIA, opciones: ['', ''] },
                    ],
                  })
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="size-4" /> Agregar pregunta
                </span>
              </Boton>
            </fieldset>

            {errores.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
                {errores.map((problema, i) => (
                  <li key={i}>{problema}</li>
                ))}
              </ul>
            )}

            <label className="flex items-center gap-2 text-sm font-semibold text-tinta">
              <input
                type="checkbox"
                checked={borrador.publicado}
                onChange={(e) => cambiar({ publicado: e.target.checked })}
                className="size-4 accent-wom-600"
              />
              Publicar ahora (si lo dejas sin marcar, queda como borrador)
            </label>

            <div className="flex flex-wrap gap-2">
              <Boton type="submit" disabled={guardando || errores.length > 0}>
                {guardando ? 'Guardando…' : 'Guardar material'}
              </Boton>
              <Boton
                type="button"
                variante="fantasma"
                onClick={() => {
                  setBorrador(null)
                  setEditandoExistente(false)
                  limpiarIa()
                }}
              >
                Cancelar
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}
    </>
  )
}
